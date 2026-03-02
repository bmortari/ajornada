"""LLM Agent — ReAct loop via OpenRouter (OpenAI-compatible) with Cube.js tools."""

import asyncio
import json
import logging
import re
from datetime import datetime, timedelta
from typing import AsyncGenerator
from dataclasses import dataclass

from openai import AsyncOpenAI

from app.config import settings
from app.services.cube_client import CubeClient
from app.services.tools import TOOLS, BI_AGENT_TOOLS, DEEP_RESEARCH_TOOLS
from app.services.llm_client import call_llm
from app.services.chart_builder import build_chart_option
from app.services.chart_catalog import catalog_for_prompt
from app.services.prompts import CONVERSATIONAL_SYSTEM_PROMPT, BI_AGENT_SYSTEM_PROMPT, DEEP_RESEARCH_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

# Special tokens that should never be shown to users
_SPECIAL_TOKENS = frozenset({
    "<|begin_of_text|>", "<|end_of_text|>", "<|start_header_id|>", "<|end_header_id|>",
    "<|eot_id|>", "<|finetune_right_pad_id|>", "<|step_id|>", "<|start_of_turn|>",
    "<|end_of_turn|>", "<s>", "</s>", "<|im_start|>", "<|im_end|>", "<|endoftext|>",
    "<|pad|>", "<|user|>", "<|assistant|>", "<|system|>",
})

def _clean_special_tokens(text: str) -> str:
    """Remove special/control tokens that leak from some models."""
    for token in _SPECIAL_TOKENS:
        text = text.replace(token, "")
    # Remove Markdown heading markers (e.g. lines starting with '#', '##', etc.)
    # This helps keep the assistant output plain and easier to stream/display.
    text = re.sub(r'(?m)^\s{0,3}#{1,6}\s*', '', text)
    return text


@dataclass
class StreamChunk:
    type: str  # "text", "chart", "kpi", "status"
    content: str = ""
    payload: dict | None = None


class LLMAgent:
    def __init__(self, cube_client: CubeClient, schema_text: str = ""):
        self.cube_client = cube_client
        self.schema_text = schema_text
        self.client = AsyncOpenAI(
            api_key=settings.openrouter_api_key,
            base_url=settings.openrouter_base_url,
        )
        # Extract valid cube names from schema text dynamically
        self._valid_cubes = self._extract_cube_names(schema_text)

    @staticmethod
    def _extract_cube_names(schema_text: str) -> set[str]:
        """Extract cube names from schema text. Falls back to known cubes if none found."""
        cubes = set(re.findall(r'### Cube: `(\w+)`', schema_text))
        if not cubes:
            cubes = {"casos_novos", "casos_baixados", "casos_pendentes", "sentencas", "datamart"}
        return cubes

    def _build_system_prompt(self, mode: str = "conversational") -> str:
        now = datetime.now()
        current_date = now.strftime("%d/%m/%Y")
        # Compute last quarter
        quarter = (now.month - 1) // 3
        if quarter == 0:
            lq_start = f"{now.year - 1}-10-01"
            lq_end = f"{now.year - 1}-12-31"
        else:
            lq_start_month = (quarter - 1) * 3 + 1
            lq_end_month = quarter * 3
            last_day = (datetime(now.year, lq_end_month + 1, 1) - timedelta(days=1)).day if lq_end_month < 12 else 31
            lq_start = f"{now.year}-{lq_start_month:02d}-01"
            lq_end = f"{now.year}-{lq_end_month:02d}-{last_day:02d}"

        if mode == "bi_agent":
            return BI_AGENT_SYSTEM_PROMPT.format(
                schema=self.schema_text,
                chart_catalog=catalog_for_prompt(),
            )
        if mode == "deep_research":
            return DEEP_RESEARCH_SYSTEM_PROMPT.format(
                schema=self.schema_text,
                current_date=current_date,
                last_quarter_start=lq_start,
                last_quarter_end=lq_end,
            )
        return CONVERSATIONAL_SYSTEM_PROMPT.format(
            schema=self.schema_text,
            current_date=current_date,
            last_quarter_start=lq_start,
            last_quarter_end=lq_end,
        )

    def _build_messages(self, message: str, history: list[dict], mode: str = "conversational") -> list[dict]:
        messages = [{"role": "system", "content": self._build_system_prompt(mode)}]

        # Determine how many history messages to keep based on mode
        history_limit = 20 if mode == "deep_research" else 10
        for h in history[-history_limit:]:
            msg: dict = {"role": h["role"], "content": h["content"]}
            # Preserve turn summaries for better cross-turn context
            if h.get("summary"):
                msg["content"] = f"[Resumo do turno anterior: {h['summary']}]\n{msg['content']}"
            messages.append(msg)

        messages.append({"role": "user", "content": message})
        return messages

    async def _execute_tool(self, tool_name: str, tool_input: dict) -> str:
        """Execute a tool and return the result as string."""
        try:
            if tool_name == "query_cube":
                # Validate required fields
                if not tool_input.get("measures"):
                    logger.error(f"query_cube called without measures: {tool_input}")
                    return json.dumps(
                        {
                            "success": False,
                            "error": "campo 'measures' é obrigatório para query_cube. Exemplo: ['casos_baixados.count']"
                        },
                        ensure_ascii=False
                    )

                # Validate cube names in measures and dimensions
                invalid_refs = []
                for ref in tool_input.get("measures", []) + tool_input.get("dimensions", []):
                    cube = ref.split(".")[0] if "." in ref else ""
                    if cube not in self._valid_cubes:
                        invalid_refs.append(ref)
                if invalid_refs:
                    return json.dumps(
                        {
                            "success": False,
                            "error": f"Refer\u00eancias inv\u00e1lidas: {invalid_refs}. "
                                     f"Cubos v\u00e1lidos: {sorted(self._valid_cubes)}. "
                                     f"Use o formato cube.campo (ex: casos_novos.count, casos_novos.grau). "
                                     f"Consulte o schema para nomes corretos."
                        },
                        ensure_ascii=False,
                    )

                query = {}
                if "measures" in tool_input:
                    query["measures"] = tool_input["measures"]
                if "dimensions" in tool_input:
                    query["dimensions"] = tool_input["dimensions"]
                if "filters" in tool_input:
                    query["filters"] = tool_input["filters"]
                if "timeDimensions" in tool_input:
                    query["timeDimensions"] = tool_input["timeDimensions"]
                if "order" in tool_input:
                    query["order"] = tool_input["order"]
                if "limit" in tool_input:
                    query["limit"] = tool_input["limit"]

                try:
                    logger.info(f"query_cube: measures={query.get('measures')}, dimensions={query.get('dimensions')}")
                    result = await self.cube_client.query(query)

                    # Validate response structure
                    if not isinstance(result, dict) or "data" not in result:
                        logger.warning("query_cube: unexpected response structure: %s", type(result))
                        return json.dumps(
                            {"success": False, "error": "Resposta inesperada do Cube.js. Tente reformular a consulta."},
                            ensure_ascii=False,
                        )

                    data = result.get("data", [])
                    annotation = result.get("annotation", {})
                    total_rows = len(data)
                    logger.info(f"query_cube result: {total_rows} rows returned")

                    # Warn on empty results
                    if total_rows == 0:
                        logger.info("query_cube: empty result set")

                    response_payload: dict = {
                        "success": True,
                        "data": data[:200],
                        "total_rows": total_rows,
                        "annotation": annotation,
                    }
                    if total_rows == 0:
                        response_payload["hint"] = (
                            "A consulta retornou 0 linhas. Verifique se os filtros estão corretos "
                            "ou tente ampliar o período/remover filtros restritivos."
                        )
                    if total_rows > 200:
                        response_payload["warning"] = (
                            f"Dados truncados: mostrando 200 de {total_rows} linhas. "
                            f"Use filters ou limit para refinar a consulta se precisar de todos os dados."
                        )
                    return json.dumps(response_payload, ensure_ascii=False)
                except Exception as e:
                    detail = str(e)
                    if hasattr(e, "response"):
                        try:
                            detail = e.response.text
                        except Exception:
                            pass
                    logger.error(f"query_cube error: {detail}", exc_info=True)
                    return json.dumps(
                        {"success": False, "error": detail}, ensure_ascii=False
                    )

            elif tool_name == "configure_chart":
                # Validate configure_chart fields
                chart_type = tool_input.get("chart_type", "bar")
                data = tool_input.get("data", [])
                x_field = tool_input.get("x_field", "")
                y_field = tool_input.get("y_field", "")

                # Ensure data is a list of dicts
                if isinstance(data, str):
                    try:
                        data = json.loads(data)
                        tool_input["data"] = data
                    except (json.JSONDecodeError, TypeError):
                        data = []
                        tool_input["data"] = data

                # Validate x_field / y_field exist in data keys (skip for kpi_grid)
                if data and isinstance(data[0], dict) and chart_type != "kpi_grid":
                    available_keys = set(data[0].keys())
                    missing = []
                    if x_field and x_field not in available_keys:
                        missing.append(f"x_field='{x_field}'")
                    if y_field and y_field not in available_keys:
                        missing.append(f"y_field='{y_field}'")
                    if missing:
                        logger.warning(
                            "configure_chart: %s not found in data keys %s",
                            missing, available_keys,
                        )
                        return json.dumps(
                            {
                                "success": False,
                                "error": f"Campos {missing} não existem nos dados. "
                                         f"Chaves disponíveis: {sorted(available_keys)}. "
                                         f"Corrija x_field/y_field para usar uma chave válida."
                            },
                            ensure_ascii=False,
                        )

                return json.dumps(
                    {"success": True, "chart_config": tool_input}, ensure_ascii=False
                )

            elif tool_name == "emit_dashboard_spec":
                # BI Agent tool: emits structured dashboard specification with validation
                errors = []

                # Validate metrics reference valid cubes
                metrics = tool_input.get("metrics", [])
                if not metrics:
                    errors.append("'metrics' é obrigatório e não pode estar vazio.")
                else:
                    for m in metrics:
                        cube = m.split(".")[0] if "." in m else ""
                        if cube and cube not in self._valid_cubes:
                            errors.append(f"Métrica '{m}' referencia cubo inválido '{cube}'. Válidos: {sorted(self._valid_cubes)}")

                # Validate chart_types
                VALID_CHART_TYPES = {
                    "bar", "horizontal_bar", "stacked_bar", "grouped_bar",
                    "line", "area", "stacked_area", "pie", "donut",
                    "scatter", "radar", "funnel", "gauge", "heatmap",
                    "treemap", "waterfall", "table",
                }
                chart_types = tool_input.get("chart_types", [])
                if not chart_types:
                    errors.append("'chart_types' é obrigatório e não pode estar vazio.")
                else:
                    for ct in chart_types:
                        ct_type = ct.get("type", "") if isinstance(ct, dict) else str(ct)
                        if ct_type not in VALID_CHART_TYPES:
                            errors.append(f"Tipo de gráfico '{ct_type}' inválido. Válidos: {sorted(VALID_CHART_TYPES)}")

                # Validate filters reference valid cubes
                filters = tool_input.get("filters", [])
                for f in filters:
                    dim = f.get("dimension", "") if isinstance(f, dict) else ""
                    cube = dim.split(".")[0] if "." in dim else ""
                    if cube and cube not in self._valid_cubes:
                        errors.append(f"Filtro com dimensão '{dim}' referencia cubo inválido '{cube}'.")

                if errors:
                    logger.warning("emit_dashboard_spec validation errors: %s", errors)
                    return json.dumps(
                        {
                            "success": False,
                            "error": "Especificação do dashboard inválida: " + "; ".join(errors),
                        },
                        ensure_ascii=False,
                    )

                return json.dumps(
                    {"success": True, "dashboard_spec": tool_input}, ensure_ascii=False
                )

            elif tool_name == "explore_schema":
                try:
                    meta = await self.cube_client.get_meta()
                    cube_name = tool_input.get("cube_name")
                    if cube_name:
                        cubes = [
                            c
                            for c in meta.get("cubes", [])
                            if c.get("name") == cube_name
                        ]
                    else:
                        cubes = meta.get("cubes", [])
                    return json.dumps(
                        {"success": True, "cubes": cubes}, ensure_ascii=False
                    )
                except Exception as e:
                    logger.error(f"explore_schema error: {e}", exc_info=True)
                    return json.dumps(
                        {"success": False, "error": str(e)}, ensure_ascii=False
                    )

            elif tool_name == "calculate":
                return self._execute_calculate(tool_input)

            elif tool_name == "statistical_summary":
                return self._execute_statistical_summary(tool_input)

            elif tool_name == "compare_periods":
                return await self._execute_compare_periods(tool_input)

            # ── Advanced statistical tools (Deep Research) ────────
            elif tool_name == "time_series_forecast":
                from app.services.statistical_engine import time_series_forecast
                return time_series_forecast(tool_input)

            elif tool_name == "correlation_analysis":
                from app.services.statistical_engine import correlation_analysis
                return correlation_analysis(tool_input)

            elif tool_name == "hypothesis_test":
                from app.services.statistical_engine import hypothesis_test
                return hypothesis_test(tool_input)

            elif tool_name == "distribution_analysis":
                from app.services.statistical_engine import distribution_analysis
                return distribution_analysis(tool_input)

            elif tool_name == "anomaly_detection":
                from app.services.statistical_engine import anomaly_detection
                return anomaly_detection(tool_input)

            elif tool_name == "regression_analysis":
                from app.services.statistical_engine import regression_analysis
                return regression_analysis(tool_input)

            return json.dumps({"error": f"Unknown tool: {tool_name}"})

        except Exception as e:
            logger.error(f"_execute_tool general error: {e}", exc_info=True)
            return json.dumps(
                {"success": False, "error": f"Tool execution error: {str(e)}"}, ensure_ascii=False
            )

    # ── Calculate tool implementation ────────────────────────────────────

    @staticmethod
    def _execute_calculate(tool_input: dict) -> str:
        """Execute mathematical calculations on data."""
        import math
        operation = tool_input.get("operation", "sum")
        values_a = [float(v) for v in tool_input.get("values_a", [])]
        values_b = [float(v) for v in tool_input.get("values_b", [])]
        labels = tool_input.get("labels", [])
        label = tool_input.get("label", "Resultado")

        try:
            result: dict = {"success": True, "label": label, "operation": operation}

            if operation == "sum":
                result["value"] = sum(values_a)

            elif operation == "average":
                result["value"] = sum(values_a) / len(values_a) if values_a else 0

            elif operation == "min_max":
                result["min"] = min(values_a) if values_a else 0
                result["max"] = max(values_a) if values_a else 0
                result["range"] = result["max"] - result["min"]

            elif operation == "ratio" and values_b:
                if len(values_a) == 1 and len(values_b) == 1:
                    result["value"] = values_a[0] / values_b[0] if values_b[0] != 0 else None
                else:
                    sa, sb = sum(values_a), sum(values_b)
                    result["value"] = sa / sb if sb != 0 else None

            elif operation == "percentage" and values_b:
                if len(values_a) == 1 and len(values_b) == 1:
                    result["value"] = (values_a[0] / values_b[0]) * 100 if values_b[0] != 0 else None
                else:
                    sa, sb = sum(values_a), sum(values_b)
                    result["value"] = (sa / sb) * 100 if sb != 0 else None

            elif operation == "delta":
                if len(values_a) == 1 and len(values_b) == 1:
                    result["value"] = values_a[0] - values_b[0]
                else:
                    result["value"] = sum(values_a) - sum(values_b)

            elif operation == "delta_percent" and values_b:
                if len(values_a) == 1 and len(values_b) == 1:
                    base = values_b[0]
                    result["value"] = ((values_a[0] - base) / base) * 100 if base != 0 else None
                else:
                    sa, sb = sum(values_a), sum(values_b)
                    result["value"] = ((sa - sb) / sb) * 100 if sb != 0 else None

            elif operation == "proportion":
                total = sum(values_a)
                if total > 0:
                    proportions = [(v / total) * 100 for v in values_a]
                    result["proportions"] = [
                        {"label": labels[i] if i < len(labels) else f"Item {i+1}", "value": round(p, 2)}
                        for i, p in enumerate(proportions)
                    ]
                else:
                    result["proportions"] = []

            elif operation == "weighted_average" and values_b:
                total_weight = sum(values_b)
                if total_weight > 0:
                    result["value"] = sum(a * b for a, b in zip(values_a, values_b)) / total_weight
                else:
                    result["value"] = 0

            elif operation == "custom":
                expression = tool_input.get("expression", "")
                # Safe evaluation with restricted builtins
                safe_builtins = {"sum": sum, "len": len, "min": min, "max": max, "abs": abs, "round": round}
                a, b = values_a, values_b
                result["value"] = eval(expression, {"__builtins__": safe_builtins, "a": a, "b": b, "math": math})

            else:
                result["value"] = sum(values_a)

            # Round numeric results
            if "value" in result and isinstance(result["value"], float):
                result["value"] = round(result["value"], 4)

            return json.dumps(result, ensure_ascii=False)

        except Exception as e:
            return json.dumps({"success": False, "error": f"Erro no cálculo: {str(e)}"}, ensure_ascii=False)

    # ── Statistical summary implementation ────────────────────────────

    @staticmethod
    def _execute_statistical_summary(tool_input: dict) -> str:
        """Generate statistical summary for a list of values."""
        import math
        values = sorted([float(v) for v in tool_input.get("values", [])])
        labels = tool_input.get("labels", [])
        label = tool_input.get("label", "Dados")

        if not values:
            return json.dumps({"success": False, "error": "Nenhum valor fornecido"}, ensure_ascii=False)

        n = len(values)
        total = sum(values)
        mean = total / n
        variance = sum((x - mean) ** 2 for x in values) / n if n > 1 else 0
        stddev = math.sqrt(variance)
        cv = (stddev / mean * 100) if mean != 0 else 0

        # Median
        if n % 2 == 0:
            median = (values[n // 2 - 1] + values[n // 2]) / 2
        else:
            median = values[n // 2]

        # Quartiles
        def percentile(data, p):
            k = (len(data) - 1) * p / 100
            f = int(k)
            c = f + 1
            if c >= len(data):
                return data[f]
            return data[f] + (k - f) * (data[c] - data[f])

        q1 = percentile(values, 25)
        q3 = percentile(values, 75)
        iqr = q3 - q1

        # Outliers (IQR method)
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        outliers = []
        for i, v in enumerate(values):
            if v < lower_bound or v > upper_bound:
                lbl = labels[i] if i < len(labels) else f"Item {i+1}"
                outliers.append({"label": lbl, "value": v})

        result = {
            "success": True,
            "label": label,
            "n": n,
            "total": round(total, 2),
            "mean": round(mean, 2),
            "median": round(median, 2),
            "stddev": round(stddev, 2),
            "cv_percent": round(cv, 2),
            "min": round(values[0], 2),
            "max": round(values[-1], 2),
            "q1": round(q1, 2),
            "q3": round(q3, 2),
            "iqr": round(iqr, 2),
            "outliers": outliers[:20],
            "distribution": {
                "skew": "positiva" if mean > median else ("negativa" if mean < median else "simétrica"),
                "spread": "alto" if cv > 50 else ("moderado" if cv > 20 else "baixo"),
            },
        }
        return json.dumps(result, ensure_ascii=False)

    # ── Compare periods implementation ────────────────────────────────

    async def _execute_compare_periods(self, tool_input: dict) -> str:
        """Compare a measure across two time periods."""
        measure = tool_input.get("measure", "")
        time_dim = tool_input.get("time_dimension", "")
        period_a = tool_input.get("period_a", [])
        period_b = tool_input.get("period_b", [])
        dimensions = tool_input.get("dimensions", [])
        filters = tool_input.get("filters", [])

        if len(period_a) != 2 or len(period_b) != 2:
            return json.dumps({"success": False, "error": "Períodos devem ter [date_from, date_to]"}, ensure_ascii=False)

        try:
            # Build queries for both periods
            base_query = {"measures": [measure]}
            if dimensions:
                base_query["dimensions"] = dimensions
            if filters:
                base_query["filters"] = filters

            query_a = {**base_query, "timeDimensions": [{"dimension": time_dim, "dateRange": period_a}]}
            query_b = {**base_query, "timeDimensions": [{"dimension": time_dim, "dateRange": period_b}]}

            result_a, result_b = await asyncio.gather(
                self.cube_client.query(query_a),
                self.cube_client.query(query_b),
            )

            data_a = result_a.get("data", [])
            data_b = result_b.get("data", [])

            comparison = {
                "success": True,
                "measure": measure,
                "period_a": {"range": period_a, "data": data_a[:50]},
                "period_b": {"range": period_b, "data": data_b[:50]},
            }

            # If no dimensions, compute aggregate comparison
            if not dimensions and data_a and data_b:
                val_a = float(data_a[0].get(measure, 0) or 0)
                val_b = float(data_b[0].get(measure, 0) or 0)
                delta = val_a - val_b
                delta_pct = ((delta / val_b) * 100) if val_b != 0 else None
                comparison["aggregate"] = {
                    "period_a_value": val_a,
                    "period_b_value": val_b,
                    "delta": round(delta, 2),
                    "delta_percent": round(delta_pct, 2) if delta_pct is not None else None,
                    "trend": "crescente" if delta > 0 else ("decrescente" if delta < 0 else "estável"),
                }

            return json.dumps(comparison, ensure_ascii=False)

        except Exception as e:
            logger.error(f"compare_periods error: {e}", exc_info=True)
            return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)

    # ── Token estimation for context window management ──────────────

    @staticmethod
    def _estimate_tokens(messages: list[dict]) -> int:
        """Estimate token count for a message list (~4 chars per token)."""
        total_chars = 0
        for m in messages:
            content = m.get("content", "")
            if content:
                total_chars += len(content)
            # Tool calls also consume tokens
            for tc in m.get("tool_calls", []):
                total_chars += len(tc.get("function", {}).get("arguments", ""))
        return total_chars // 4

    @staticmethod
    def _compress_tool_results(messages: list[dict], max_tokens: int = 100_000) -> list[dict]:
        """If messages exceed max_tokens, compress older tool results to summaries."""
        estimated = 0
        for m in messages:
            content = m.get("content", "")
            estimated += len(content) // 4

        if estimated <= max_tokens:
            return messages

        # Keep system prompt and last 4 messages intact. Compress tool results in the middle.
        compressed = [messages[0]]  # system prompt
        middle = messages[1:-4]
        tail = messages[-4:]

        for m in middle:
            if m.get("role") == "tool":
                content = m.get("content", "")
                try:
                    parsed = json.loads(content)
                    if parsed.get("success") and "data" in parsed:
                        row_count = len(parsed["data"])
                        # Keep only first 5 rows and add summary
                        parsed["data"] = parsed["data"][:5]
                        parsed["_compressed"] = f"Dados comprimidos: mostrando 5 de {row_count} linhas originais."
                        m = {**m, "content": json.dumps(parsed, ensure_ascii=False)}
                except (json.JSONDecodeError, TypeError):
                    pass
            compressed.append(m)

        return compressed + tail

    async def stream(
        self, message: str, history: list[dict], model: str = "meta-llama/llama-3.3-70b-instruct:free", mode: str = "conversational", deep_search: bool = False
    ) -> AsyncGenerator[StreamChunk, None]:
        """ReAct loop: call LLM via OpenRouter with TRUE streaming, execute tools, stream results."""

        yield StreamChunk(type="status", content="Analisando consulta...")

        messages = self._build_messages(message, history, mode)

        # Select tools and max iterations based on mode and deep_search flag
        if mode == "deep_research":
            tools = DEEP_RESEARCH_TOOLS
            max_iterations = 30 if deep_search else 20
        elif mode == "bi_agent":
            tools = BI_AGENT_TOOLS
            max_iterations = 20 if deep_search else 8
        else:
            tools = TOOLS
            max_iterations = 20 if deep_search else 8

        # Planning step: inject a planning instruction tailored to the mode
        if mode == "conversational":
            planning_hint = {
                "role": "system",
                "content": (
                    "INSTRUÇÃO OBRIGATÓRIA:\n"
                    "1. Chame query_cube (com measures!) para obter os dados\n"
                    "2. Chame configure_chart para gerar 1 gráfico (se fizer sentido visual)\n"
                    "3. Escreva o texto analítico COMPLETO uma única vez\n"
                    "4. PARE — não repita, não gere mais gráficos, não faça mais queries\n\n"
                    "CRÍTICO: NÃO escreva NENHUM texto antes de chamar as ferramentas. "
                    "Texto antes das ferramentas aparece duplicado na tela."
                ),
            }
            messages.insert(1, planning_hint)
        elif mode == "deep_research":
            planning_hint = {
                "role": "system",
                "content": (
                    "ANTES de usar qualquer ferramenta, escreva um PLANO DETALHADO de análise. Exemplo:\n"
                    "1. Consultar volume total no cube X\n"
                    "2. Analisar distribuição por dimensão Y\n"
                    "3. Comparar períodos com compare_periods\n"
                    "4. Aplicar statistical_summary nos valores\n"
                    "5. Gerar gráficos para os principais achados\n"
                    "6. Escrever relatório completo\n"
                    "Execute o plano passo a passo, explorando múltiplos ângulos."
                ),
            }
            messages.insert(1, planning_hint)

        # ReAct loop
        for iteration in range(max_iterations):
            # Context window management: compress if too large
            messages = self._compress_tool_results(messages)

            try:
                response_stream = await call_llm(
                    self.client,
                    model=model,
                    fallback_models=settings.openrouter_fallback_models,
                    max_tokens=4096 if mode != "deep_research" else 8192,
                    messages=messages,
                    tools=tools,
                    stream=True,
                )
            except Exception as e:
                logger.error(f"OpenRouter API error: {e}")
                yield StreamChunk(
                    type="text",
                    content=f"Desculpe, ocorreu um erro ao processar sua consulta: {str(e)}",
                )
                return

            # ── Consume the streaming response (async) ──────────────
            text_content = ""
            reasoning_content = ""
            tool_calls_acc: dict[int, dict] = {}  # index → accumulated tool call
            has_tool_calls = False

            try:
                async for chunk in response_stream:
                    if not chunk.choices:
                        continue
                    delta = chunk.choices[0].delta

                    # Capture reasoning_details (OpenRouter reasoning tokens)
                    reasoning_details = getattr(delta, "reasoning_details", None)
                    if reasoning_details:
                        for rd in reasoning_details:
                            rd_text = getattr(rd, "text", None) or getattr(rd, "summary", None) or ""
                            if rd_text:
                                reasoning_content += rd_text

                    # Capture reasoning field (simple string from some models)
                    reasoning_str = getattr(delta, "reasoning", None)
                    if reasoning_str:
                        reasoning_content += reasoning_str

                    # Stream text in natural chunks from API
                    if delta and delta.content:
                        clean = _clean_special_tokens(delta.content)
                        if clean:
                            text_content += clean
                            # Emit chunk as-is for real-time streaming
                            yield StreamChunk(type="text", content=clean)

                    # Accumulate tool call deltas
                    if delta and delta.tool_calls:
                        has_tool_calls = True
                        for tc_delta in delta.tool_calls:
                            idx = tc_delta.index
                            if idx not in tool_calls_acc:
                                tool_calls_acc[idx] = {
                                    "id": "",
                                    "type": "function",
                                    "function": {"name": "", "arguments": ""},
                                }
                            if tc_delta.id:
                                tool_calls_acc[idx]["id"] = tc_delta.id
                            if tc_delta.function:
                                if tc_delta.function.name:
                                    tool_calls_acc[idx]["function"]["name"] += tc_delta.function.name
                                if tc_delta.function.arguments:
                                    tool_calls_acc[idx]["function"]["arguments"] += tc_delta.function.arguments
            except Exception as e:
                logger.error(f"Stream iteration error: {e}")
                yield StreamChunk(
                    type="text",
                    content=f"Desculpe, ocorreu um erro durante o streaming: {str(e)}",
                )
                return

            # ── Emit reasoning/thinking collected during stream ──
            if reasoning_content.strip():
                yield StreamChunk(type="thinking", content=reasoning_content.strip())

            # ── After stream completes: handle tool calls or finish ──
            if has_tool_calls and tool_calls_acc:
                # Text before tool calls = intermediate reasoning → flush to thinking
                if text_content.strip():
                    yield StreamChunk(type="thinking_flush", content=text_content.strip())

                # Build assistant message for conversation history
                tool_calls_list = list(tool_calls_acc.values())
                msg_dict: dict = {
                    "role": "assistant",
                    "content": text_content or " ",
                    "tool_calls": tool_calls_list,
                }
                messages.append(msg_dict)

                # Execute each tool and collect results
                for tc in tool_calls_list:
                    tool_name = tc["function"]["name"]
                    try:
                        tool_input = json.loads(tc["function"]["arguments"])
                    except json.JSONDecodeError as parse_err:
                        logger.warning(
                            "Tool arg parse error for %s: %s | raw: %.200s",
                            tool_name, parse_err, tc["function"]["arguments"],
                        )
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tc["id"],
                            "content": json.dumps({
                                "success": False,
                                "error": f"Argumentos JSON malformados para '{tool_name}'. "
                                         f"Corrija o JSON e tente novamente. Detalhe: {parse_err}"
                            }, ensure_ascii=False),
                        })
                        continue

                    logger.info(f"Executing tool: {tool_name}")

                    if tool_name == "query_cube":
                        yield StreamChunk(type="status", content="Executando query no Cube.js...")
                    elif tool_name == "configure_chart":
                        yield StreamChunk(type="status", content="Gerando visualização...")
                    elif tool_name == "explore_schema":
                        yield StreamChunk(type="status", content="Explorando schema de dados...")
                    elif tool_name == "emit_dashboard_spec":
                        yield StreamChunk(type="status", content="Preparando especificação do painel...")
                    elif tool_name == "calculate":
                        yield StreamChunk(type="status", content="Realizando cálculos...")
                    elif tool_name == "statistical_summary":
                        yield StreamChunk(type="status", content="Gerando resumo estatístico...")
                    elif tool_name == "compare_periods":
                        yield StreamChunk(type="status", content="Comparando períodos...")
                    elif tool_name == "time_series_forecast":
                        yield StreamChunk(type="status", content="Executando previsão de séries temporais...")
                    elif tool_name == "correlation_analysis":
                        yield StreamChunk(type="status", content="Analisando correlações...")
                    elif tool_name == "hypothesis_test":
                        yield StreamChunk(type="status", content="Executando teste de hipótese...")
                    elif tool_name == "distribution_analysis":
                        yield StreamChunk(type="status", content="Analisando distribuição dos dados...")
                    elif tool_name == "anomaly_detection":
                        yield StreamChunk(type="status", content="Detectando anomalias...")
                    elif tool_name == "regression_analysis":
                        yield StreamChunk(type="status", content="Ajustando modelo de regressão...")

                    result = await self._execute_tool(tool_name, tool_input)

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc["id"],
                        "content": result,
                    })

                    # Emit chart events immediately for configure_chart
                    if tool_name == "configure_chart":
                        chart_config = tool_input
                        chart_type = chart_config.get("chart_type", "bar")

                        # LLM sometimes passes data as JSON string instead of array
                        raw_data = chart_config.get("data", [])
                        if isinstance(raw_data, str):
                            try:
                                raw_data = json.loads(raw_data)
                            except (json.JSONDecodeError, TypeError):
                                raw_data = []
                            chart_config["data"] = raw_data

                        # Ensure data items are dicts (LLM may send flat values)
                        if raw_data and not isinstance(raw_data[0], dict):
                            logger.warning("configure_chart data items are not dicts: %s", type(raw_data[0]))
                            chart_config["data"] = []

                        # Generate ECharts option if not provided by LLM
                        if "option" not in chart_config:
                            chart_config["option"] = build_chart_option(chart_config)
                        
                        logger.info(f"Emitting chart event: {chart_type}")
                        if chart_type == "kpi_grid":
                            yield StreamChunk(type="kpi", payload=chart_config)
                        else:
                            yield StreamChunk(type="chart", payload=chart_config)

                    # Emit workspace_ready for BI agent's emit_dashboard_spec
                    elif tool_name == "emit_dashboard_spec":
                        logger.info(f"Emitting workspace_ready: {tool_input}")
                        yield StreamChunk(type="workspace_ready", payload=tool_input)

                yield StreamChunk(type="status", content="Interpretando resultados...")
                continue  # Next iteration of ReAct loop

            else:
                # No tool calls — final text response
                # Text was already streamed word-by-word above, so don't re-emit.
                # Only emit if nothing was streamed (empty text_content)
                if not text_content.strip():
                    yield StreamChunk(type="text", content="")

                # Emit a turn summary for cross-turn context persistence
                if text_content.strip():
                    # Extract a brief summary of what was analyzed/answered
                    summary_text = text_content.strip()[:300]
                    yield StreamChunk(type="turn_summary", content=summary_text)

                # BI agent mode: if the model didn't call emit_dashboard_spec,
                # try to parse the text for structured info and nudge user.
                if mode == "bi_agent" and text_content.strip():
                    # Check if the model provided text instead of calling tools.
                    # This is expected during the conversation to collect info.
                    # We just let it through — the text was already streamed.
                    pass

                return

        # Iterations exhausted — ask the model to compose a final answer from what it has
        logger.warning("ReAct loop exhausted after %d iterations; requesting graceful summary", max_iterations)
        yield StreamChunk(type="status", content="Consolidando análise...")

        # Inject a final instruction to wrap up without calling any tools
        messages.append({
            "role": "user",
            "content": (
                "Você já realizou diversas consultas e cálculos. "
                "Com base em tudo que foi apurado até agora, elabore uma resposta final completa e objetiva, "
                "sem chamar nenhuma ferramenta adicional."
            ),
        })

        try:
            response_stream = await call_llm(
                self.client,
                model=model,
                fallback_models=settings.openrouter_fallback_models,
                max_tokens=4096,
                messages=messages,
                tools=[],  # No tools available – force text response
                stream=True,
            )
            async for chunk in response_stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    clean = _clean_special_tokens(delta.content)
                    if clean:
                        yield StreamChunk(type="text", content=clean)
        except Exception as e:
            logger.error(f"Graceful summary error: {e}")
            yield StreamChunk(
                type="text",
                content="A análise foi concluída com os dados obtidos. Se precisar de mais detalhes, tente uma pergunta mais específica.",
            )
