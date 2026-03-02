"""Dashboard Builder Pipeline — structured 4-step dashboard generation."""

import asyncio
import json
import logging
import re
import time
from typing import Any

from openai import AsyncOpenAI

from app.config import settings
from app.services.cube_client import CubeClient
from app.services.llm_client import call_llm
from app.services.chart_builder import build_chart_option
from app.services.chart_catalog import VALID_CHART_TYPES, catalog_for_prompt
from app.services.prompts import STEP2_SYSTEM_PROMPT, STEP3_CHART_TYPES_PROMPT, STEP4_DASHBOARD_PROMPT
from app.models.pipeline import (
    FilterDimensionWithValues,
    MetricOption,
    SelectedFilter,
    PeriodFilter,
    SelectedMetric,
    Step1Response,
    Step2Response,
    Step3Response,
    Step4Response,
)

logger = logging.getLogger(__name__)

# ── Dimensions that are available as user-selectable filters ───────────

FILTER_DIMENSIONS = [
    {"name": "grau",               "title": "Grau",              "primary_cube": "casos_novos", "type": "string"},
    {"name": "nome_ultima_classe", "title": "Classe Processual", "primary_cube": "casos_novos", "type": "string"},
    {"name": "nome_orgao",         "title": "Orgao Julgador",    "primary_cube": "casos_novos", "type": "string"},
    {"name": "formato",            "title": "Formato",           "primary_cube": "casos_novos", "type": "string"},
    {"name": "procedimento",       "title": "Procedimento",      "primary_cube": "casos_novos", "type": "string"},
    {"name": "uf",                 "title": "UF",                "primary_cube": "casos_novos", "type": "string"},
    {"name": "municipio",          "title": "Municipio",         "primary_cube": "casos_novos", "type": "string"},
    {"name": "poder_publico",      "title": "Poder Publico",     "primary_cube": "casos_novos", "type": "string"},
]

DEFAULT_SUGGESTIONS = ["grau", "nome_ultima_classe", "nome_orgao"]

# ── All available measures across cubes ────────────────────────────────

ALL_METRICS = [
    {"name": "casos_novos.count",                    "title": "Total de Casos Novos",       "cube": "casos_novos",    "type": "count"},
    {"name": "casos_novos.processos_distintos",      "title": "Processos Distintos (Novos)", "cube": "casos_novos",    "type": "count_distinct"},
    {"name": "casos_baixados.count",                 "title": "Total de Baixas",             "cube": "casos_baixados", "type": "count"},
    {"name": "casos_baixados.processos_distintos",   "title": "Processos Baixados",          "cube": "casos_baixados", "type": "count_distinct"},
    {"name": "casos_baixados.tempo_medio_baixa_dias","title": "Tempo Medio ate Baixa (dias)","cube": "casos_baixados", "type": "avg"},
    {"name": "casos_pendentes.count",                "title": "Total de Pendentes",          "cube": "casos_pendentes","type": "count"},
    {"name": "casos_pendentes.dias_antiguidade_media","title": "Antiguidade Media (dias)",   "cube": "casos_pendentes","type": "avg"},
    {"name": "casos_pendentes.casos_liquidos",       "title": "Casos Liquidos",              "cube": "casos_pendentes","type": "count"},
    {"name": "casos_pendentes.casos_mais_15_anos",   "title": "Casos com +15 anos",          "cube": "casos_pendentes","type": "count"},
    {"name": "sentencas.count",                      "title": "Total de Sentencas",          "cube": "sentencas",      "type": "count"},
    {"name": "sentencas.processos_distintos",        "title": "Processos com Sentenca",      "cube": "sentencas",      "type": "count_distinct"},
    {"name": "datamart.count",                       "title": "Total de Processos",          "cube": "datamart",       "type": "count"},
    {"name": "datamart.valor_causa_soma",            "title": "Valor Total das Causas",      "cube": "datamart",       "type": "sum"},
    {"name": "datamart.valor_causa_medio",           "title": "Valor Medio da Causa",        "cube": "datamart",       "type": "avg"},
]

# ── Shared dimensions across all cubes (for cross-cube filter remapping) ──

SHARED_DIMENSIONS = {
    "tribunal", "grau", "nome_orgao", "uf", "municipio",
    "ano", "mes", "nome_ultima_classe", "formato",
    "procedimento", "poder_publico",
}

# ── LLM Prompts (centralized in prompts.py) ───────────────────────────


def _extract_json(text: str) -> dict:
    """Robustly extract JSON from LLM response that may contain prose or markdown."""
    text = text.strip()
    # 1. Direct parse
    try:
        return json.loads(text)
    except (json.JSONDecodeError, ValueError):
        pass
    # 2. Extract from markdown code block
    m = re.search(r'```(?:json|JSON)?\s*\n?(.*?)```', text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1).strip())
        except (json.JSONDecodeError, ValueError):
            pass
    # 3. Find first {...} block
    m = re.search(r'\{.*\}', text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(0))
        except (json.JSONDecodeError, ValueError):
            pass
    raise ValueError(f"No valid JSON found in response: {text[:200]}")


class PipelineService:
    # Class-level cache for filter dimensions (TTL-based)
    _filter_cache: dict | None = None
    _filter_cache_time: float = 0
    _FILTER_CACHE_TTL: float = 600  # 10 minutes

    def __init__(self, cube_client: CubeClient, schema_text: str = ""):
        self.cube_client = cube_client
        self.schema_text = schema_text
        self.client = AsyncOpenAI(
            api_key=settings.openrouter_api_key,
            base_url=settings.openrouter_base_url,
        )

    # ── Helper: LLM call with JSON extraction + retry ─────────────────

    async def _llm_json_call(
        self, model: str, messages: list[dict], max_tokens: int = 500
    ) -> dict:
        """Call LLM expecting JSON response. Retries up to 2x with corrective feedback on parse failure."""
        last_raw = ""
        attempt_messages = list(messages)

        for attempt in range(3):
            try:
                response = await call_llm(
                    self.client,
                    model=model,
                    fallback_models=settings.openrouter_fallback_models,
                    messages=attempt_messages,
                    max_tokens=max_tokens,
                    temperature=0.2,
                    stream=False,
                )
                last_raw = response.choices[0].message.content.strip()
                logger.info("[LLM-JSON] attempt %d raw (500c): %.500s", attempt + 1, last_raw)
                return _extract_json(last_raw)

            except ValueError:
                if attempt < 2:
                    logger.warning("[LLM-JSON] JSON parse failed (attempt %d): %.200s", attempt + 1, last_raw)
                    attempt_messages = attempt_messages + [
                        {"role": "assistant", "content": last_raw},
                        {"role": "user", "content": "Sua resposta anterior NAO era JSON valido. Responda SOMENTE com o objeto JSON puro, sem explicacoes, sem markdown."},
                    ]
                else:
                    raise

            except Exception as e:
                if attempt < 2:
                    logger.warning("[LLM-JSON] Call error (attempt %d): %s", attempt + 1, e)
                else:
                    raise

        raise ValueError("Failed to get valid JSON after 3 attempts")

    # ── Step 1: Filter dimensions with distinct values ─────────────────

    async def get_filter_dimensions(self) -> Step1Response:
        """Load available filter dimensions with their distinct values. Cached for 10 minutes."""

        # Check cache
        now = time.time()
        if (PipelineService._filter_cache is not None
                and (now - PipelineService._filter_cache_time) < PipelineService._FILTER_CACHE_TTL):
            logger.info("[Step1] Returning cached filter dimensions")
            return PipelineService._filter_cache

        async def fetch_values(dim: dict) -> FilterDimensionWithValues:
            cube = dim["primary_cube"]
            name = dim["name"]
            try:
                result = await self.cube_client.query({
                    "measures": [f"{cube}.count"],
                    "dimensions": [f"{cube}.{name}"],
                    "order": {f"{cube}.count": "desc"},
                    "limit": 50,
                })
                data = result.get("data", [])
                full_key = f"{cube}.{name}"
                values = [str(row[full_key]) for row in data if row.get(full_key)]
            except Exception as e:
                logger.warning(f"Failed to fetch values for {cube}.{name}: {e}")
                values = []

            return FilterDimensionWithValues(
                name=name,
                title=dim["title"],
                cube=cube,
                type=dim["type"],
                values=values,
            )

        dimensions = await asyncio.gather(
            *[fetch_values(dim) for dim in FILTER_DIMENSIONS]
        )

        result = Step1Response(
            dimensions=list(dimensions),
            suggested=DEFAULT_SUGGESTIONS,
        )

        # Store in cache
        PipelineService._filter_cache = result
        PipelineService._filter_cache_time = time.time()
        logger.info("[Step1] Filter dimensions cached for %ds", int(PipelineService._FILTER_CACHE_TTL))

        return result

    # ── Step 2: AI metric suggestions ──────────────────────────────────

    async def suggest_metrics(
        self,
        filters: list[SelectedFilter],
        period: PeriodFilter | None,
        model: str = "meta-llama/llama-3.3-70b-instruct:free",
    ) -> Step2Response:
        """Use LLM to suggest 2 metrics based on user's filter choices."""

        metrics_list = "\n".join(
            f"- `{m['name']}` ({m['type']}) — {m['title']}"
            for m in ALL_METRICS
        )

        filters_desc = "\n".join(
            f"- {f.dimension} = {f.values}" for f in filters
        ) if filters else "Nenhum filtro selecionado."

        period_desc = (
            f"{period.date_from} a {period.date_to}" if period
            else "Nenhum periodo especifico."
        )

        prompt = STEP2_SYSTEM_PROMPT.format(
            metrics_list=metrics_list,
            filters_description=filters_desc,
            period_description=period_desc,
        )

        # LLM call (synchronous — run in thread to not block event loop)
        suggested = ["casos_novos.count", "sentencas.count"]
        reasoning = "Metricas padrao selecionadas."

        try:
            parsed = await self._llm_json_call(
                model=model,
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": "Sugira as 2 metricas mais relevantes."},
                ],
                max_tokens=500,
            )
            suggested = parsed.get("suggested_metrics", suggested)
            reasoning = parsed.get("reasoning", reasoning)
        except Exception as e:
            logger.warning(f"Step 2 LLM call failed, using defaults: {e}")

        all_metrics = [MetricOption(**m) for m in ALL_METRICS]

        return Step2Response(
            all_metrics=all_metrics,
            suggested_metrics=suggested,
            suggestion_reasoning=reasoning,
        )

    # ── Step 3: AI chart type suggestions ────────────────────────────────

    async def suggest_chart_types(
        self,
        filters: list[SelectedFilter],
        metrics: list[SelectedMetric],
        model: str = "meta-llama/llama-3.3-70b-instruct:free",
    ) -> Step3Response:
        """Use LLM to suggest chart types based on filters and metrics."""

        filters_desc = "\n".join(
            f"- {f.dimension} = {f.values}" for f in filters
        ) if filters else "Nenhum filtro selecionado."

        metrics_desc = "\n".join(
            f"- `{m.name}`" for m in metrics
        )

        prompt = STEP3_CHART_TYPES_PROMPT.format(
            filters_description=filters_desc,
            metrics_description=metrics_desc,
        )

        suggested = ["bar", "line", "pie"]
        reasoning = "Tipos padrão sugeridos para análise geral."

        try:
            parsed = await self._llm_json_call(
                model=model,
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": "Sugira os tipos de gráfico mais adequados."},
                ],
                max_tokens=500,
            )
            raw_types = parsed.get("suggested_chart_types", [])
            # Normalize: accept list of strings or list of dicts with "type"
            suggested_out = []
            for item in raw_types:
                if isinstance(item, str):
                    suggested_out.append(item)
                elif isinstance(item, dict) and "type" in item:
                    suggested_out.append(item["type"])
            if suggested_out:
                suggested = suggested_out
            reasoning = parsed.get("reasoning", reasoning)
        except Exception as e:
            logger.warning(f"Step 3 LLM call failed, using defaults: {e}")

        return Step3Response(
            suggested_chart_types=suggested,
            reasoning=reasoning,
        )

    # ── Step 4: Dashboard generation ───────────────────────────────────

    async def generate_dashboard(
        self,
        filters: list[SelectedFilter],
        period: PeriodFilter | None,
        metrics: list[SelectedMetric],
        chart_types: list[str] | None = None,
        model: str = "meta-llama/llama-3.3-70b-instruct:free",
        dimension_filters: list[dict] | None = None,
    ) -> Step4Response:
        """Use LLM to design dashboard, execute queries, return rendered result."""

        # ── Pre-flight: validate that metrics have data in Cube ──
        validated_metrics = await self._preflight_validate_metrics(metrics, filters, period)
        if not validated_metrics:
            logger.error("[Step4] Pre-flight: No metrics returned data. Using original list as fallback.")
            validated_metrics = metrics
        elif len(validated_metrics) < len(metrics):
            dropped = set(m.name for m in metrics) - set(m.name for m in validated_metrics)
            logger.warning("[Step4] Pre-flight: Dropped metrics with no data: %s", dropped)
        metrics = validated_metrics

        filters_desc = "\n".join(
            f"- {f.dimension} = {f.values}" for f in filters
        ) if filters else "Nenhum filtro de dados aplicado."

        # Include dimension_filters as available dashboard dimensions
        dims_desc = ""
        if dimension_filters:
            dims_desc = "\n## Dimensoes disponiveis para graficos\n" + "\n".join(
                f"- `{d['dimension']}` ({d['title']})" for d in dimension_filters
            ) + "\n\nUse essas dimensoes nos graficos quando apropriado.\n"

        period_desc = (
            f"{period.date_from} a {period.date_to}" if period
            else "Sem periodo especifico."
        )

        metrics_desc = "\n".join(
            f"- `{m.name}`" for m in metrics
        )

        chart_types_desc = ""
        chart_type_list: list[str] = []  # flattened list of type strings
        if chart_types:
            for ct in chart_types:
                if isinstance(ct, dict):
                    t = ct.get("type", "bar")
                    desc = ct.get("description", "")
                    chart_type_list.append(t)
                    chart_types_desc += f"- {t}: {desc}\n" if desc else f"- {t}\n"
                else:
                    chart_type_list.append(str(ct))
                    chart_types_desc += f"- {ct}\n"
        else:
            chart_type_list = ["bar", "line", "pie"]
            chart_types_desc = "- bar\n- line\n- pie\n"

        num_charts = len(chart_type_list)
        num_kpis = min(len(metrics), 4) if metrics else 1

        prompt = STEP4_DASHBOARD_PROMPT.format(
            filters_description=filters_desc,
            dims_description=dims_desc,
            period_description=period_desc,
            metrics_description=metrics_desc,
            chart_types_description=chart_types_desc,
            chart_catalog=catalog_for_prompt(),
            schema_text=self.schema_text,
            num_charts=num_charts,
            num_kpis=num_kpis,
        )

        # ── LLM call to design dashboard composition ──

        design = None
        try:
            design = await self._llm_json_call(
                model=model,
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": "Projete o dashboard."},
                ],
                max_tokens=2000,
            )
            logger.info("[Step4] LLM design parsed: %s", json.dumps(design, ensure_ascii=False)[:1000])

            # Validate LLM design — charts must have valid measures
            design = self._validate_design(design, metrics, chart_type_list)

            # Supplement missing chart types — use Counter to preserve duplicates
            if design and chart_type_list:
                from collections import Counter
                requested_counts = Counter(chart_type_list)
                existing_counts = Counter(cd.get("chart_type") for cd in design.get("charts", []))
                missing: list[str] = []
                for t, cnt in requested_counts.items():
                    diff = cnt - existing_counts.get(t, 0)
                    missing.extend([t] * diff)
                if missing:
                    metric_names = [m.name for m in metrics]
                    primary_metric = metric_names[0] if metric_names else "casos_novos.count"
                    primary_cube = primary_metric.split(".")[0]
                    for ct in missing:
                        supplement = self._make_chart_def(ct, primary_cube, primary_metric, dimension_filters=dimension_filters)
                        design["charts"].append(supplement)
                        logger.info("[Step4] Supplemented missing chart type: %s", ct)

        except Exception as e:
            logger.error(f"Step 4 LLM design failed: {e}")

        # Fallback if design is None or has no valid charts
        if not design or not design.get("charts"):
            logger.warning("[Step4] Using fallback design")
            metric_names = [m.name for m in metrics]
            primary_metric = metric_names[0] if metric_names else "casos_novos.count"
            primary_cube = primary_metric.split(".")[0]
            filter_dims = []
            if dimension_filters:
                filter_dims = [d["dimension"].split(".")[-1] for d in dimension_filters]
            elif filters:
                filter_dims = [f.dimension.split(".")[-1] for f in filters if f.values]
            design = self._fallback_design(
                primary_cube, primary_metric, metric_names,
                chart_types=chart_type_list, filter_dims=filter_dims,
            )

        dashboard_title = design.get("title", "Painel Analitico")
        chart_defs = design.get("charts", [])
        kpi_defs = design.get("kpis", [])

        # Smart span adjustment
        self._adjust_spans(chart_defs)

        # Fetch distinct values for dimension_filters so frontend can render selects
        resolved_dim_filters = []
        if dimension_filters:
            async def fetch_dim_values(d: dict) -> dict:
                dim = d["dimension"]
                cube = dim.split(".")[0] if "." in dim else "casos_novos"
                dim_name = dim.split(".")[-1]
                try:
                    result = await self.cube_client.query({
                        "measures": [f"{cube}.count"],
                        "dimensions": [f"{cube}.{dim_name}"],
                        "order": {f"{cube}.count": "desc"},
                        "limit": 50,
                    })
                    data = result.get("data", [])
                    key = f"{cube}.{dim_name}"
                    def _fmt(v):
                        if isinstance(v, float) and v == int(v):
                            return str(int(v))
                        return str(v)
                    values = [_fmt(row[key]) for row in data if row.get(key)]
                    return {"dimension": dim, "title": d["title"], "values": values}
                except Exception as e:
                    logger.warning("[Step4] Failed to fetch dim values for %s: %s", dim, e)
                    return {"dimension": dim, "title": d["title"], "values": []}
            resolved_dim_filters = await asyncio.gather(*[fetch_dim_values(d) for d in dimension_filters])

        # ── Execute all queries in parallel ──

        chart_tasks = [
            self._execute_chart_query(cd, filters, period) for cd in chart_defs
        ]
        kpi_tasks = [
            self._execute_kpi_query(kd, filters, period) for kd in kpi_defs
        ]

        results = await asyncio.gather(
            *chart_tasks, *kpi_tasks, return_exceptions=True
        )

        charts_results = results[:len(chart_defs)]
        kpis_results = results[len(chart_defs):]

        # ── Assemble final payloads (shared logic) ──
        charts = self._assemble_charts(chart_defs, charts_results)
        kpis = self._assemble_kpis(kpi_defs, kpis_results)

        # Fetch sparkline data for each KPI
        sparkline_tasks = [self._fetch_sparkline(kd, filters) for kd in kpi_defs]
        sparkline_results = await asyncio.gather(*sparkline_tasks, return_exceptions=True)
        for ki, spark in enumerate(sparkline_results):
            if ki < len(kpis) and isinstance(spark, list) and len(spark) > 1:
                kpis[ki]["sparkline"] = spark

        return Step4Response(
            title=dashboard_title,
            kpis=kpis,
            charts=charts,
            dimension_filters=resolved_dim_filters if resolved_dim_filters else (dimension_filters or []),
            chart_defs=chart_defs,
            kpi_defs=kpi_defs,
        )

    # ── Helper: assemble chart payloads from query results ──────────

    @staticmethod
    def _assemble_charts(chart_defs: list[dict], results: list) -> list[dict]:
        """Build chart configs from definitions + query results. Shared by generate and requery."""
        charts = []
        for cd, result in zip(chart_defs, results):
            if isinstance(result, Exception):
                logger.error("Chart query failed: %s", result)
                continue
            data = result.get("data", [])
            if not data:
                continue

            chart_type = cd.get("chart_type", "bar")
            dims = cd.get("dimensions", [])
            measures = cd.get("measures", [])

            # Determine x_field and y_field
            x_field = dims[0] if dims else None
            y_field = measures[0] if measures else None

            # If time_dimension with granularity, the time field appears in data
            if cd.get("time_dimension") and cd.get("granularity"):
                td = cd["time_dimension"]
                granularity = cd["granularity"]
                x_field = f"{td}.{granularity}"

            # Validate that x_field and y_field exist in actual data keys
            data_keys = list(data[0].keys()) if data else []
            if x_field and x_field not in data_keys:
                logger.warning("x_field '%s' not in data keys %s — auto-detecting", x_field, data_keys)
                x_field = next((k for k in data_keys if isinstance(data[0].get(k), str)), data_keys[0] if data_keys else None)
            if y_field and y_field not in data_keys:
                logger.warning("y_field '%s' not in data keys %s — auto-detecting", y_field, data_keys)
                y_field = next((k for k in data_keys if isinstance(data[0].get(k), (int, float))), data_keys[-1] if data_keys else None)

            chart_config = {
                "chart_type": chart_type,
                "title": cd.get("title", ""),
                "description": cd.get("description", ""),
                "data": data[:200],
                "x_field": x_field,
                "y_field": y_field,
                "span": cd.get("span", "col-4"),
            }
            chart_config["option"] = build_chart_option(chart_config)
            charts.append(chart_config)

        return charts

    # ── Helper: assemble KPI payloads from query results ─────────────

    @staticmethod
    def _assemble_kpis(kpi_defs: list[dict], results: list) -> list[dict]:
        """Build KPI cards from definitions + query results. Shared by generate and requery."""
        kpis = []
        for kd, result in zip(kpi_defs, results):
            if isinstance(result, Exception):
                logger.error("KPI query failed: %s", result)
                continue
            data = result.get("data", [])
            measure_key = kd.get("measure", "")
            value = data[0].get(measure_key, 0) if data else 0

            # Format value
            try:
                num = float(value)
                if num >= 1_000_000:
                    formatted = f"{num/1_000_000:,.1f}M"
                elif num >= 1_000:
                    formatted = f"{num:,.0f}".replace(",", ".")
                else:
                    formatted = f"{num:,.1f}" if num != int(num) else str(int(num))
            except (ValueError, TypeError):
                formatted = str(value)

            kpis.append({
                "label": kd.get("label", measure_key),
                "value": formatted,
            })

        return kpis

    # ── Helper: smart span adjustment ──────────────────────────────────

    @staticmethod
    def _adjust_spans(chart_defs: list[dict]) -> None:
        """Intelligently assign grid spans to charts based on count and type.
        Charts are placed in rows of 12 columns. Chart types influence preferred widths."""
        if not chart_defs:
            return

        # Preferred widths by chart type (some types look better wider/narrower)
        _PREFERRED_SPAN = {
            "gauge": 4, "pie": 4, "donut": 4, "funnel": 4,
            "radar": 6, "scatter": 6, "treemap": 6, "waterfall": 6,
            "bar": 6, "horizontal_bar": 6, "stacked_bar": 6, "grouped_bar": 6,
            "line": 6, "area": 6, "stacked_area": 6,
            "heatmap": 12, "table": 12,
        }

        n = len(chart_defs)

        if n == 1:
            chart_defs[0]["span"] = "col-12"
            return

        if n == 2:
            chart_defs[0]["span"] = "col-6"
            chart_defs[1]["span"] = "col-6"
            return

        # For 3+ charts: fill rows of 12 columns
        # Strategy: assign preferred spans, place into rows, adjust last chart in each row
        spans = []
        for cd in chart_defs:
            ct = cd.get("chart_type", "bar")
            preferred = _PREFERRED_SPAN.get(ct, 6)
            spans.append(preferred)

        # Fill rows greedily
        rows: list[list[int]] = []
        current_row: list[int] = []
        current_sum = 0
        for i, sp in enumerate(spans):
            if current_sum + sp > 12:
                # Adjust last item in current row to fill remaining space
                if current_row:
                    remaining = 12 - sum(current_row[:-1])
                    current_row[-1] = max(remaining, 4)
                rows.append(current_row)
                current_row = [sp]
                current_sum = sp
            else:
                current_row.append(sp)
                current_sum += sp

        # Last row: expand to fill
        if current_row:
            remaining = 12
            for j in range(len(current_row) - 1):
                remaining -= current_row[j]
            current_row[-1] = max(remaining, 4)
            rows.append(current_row)

        # Flatten back and assign
        flat_spans = [s for row in rows for s in row]
        for i, cd in enumerate(chart_defs):
            if i < len(flat_spans):
                cd["span"] = f"col-{flat_spans[i]}"
            else:
                cd["span"] = "col-6"

    # ── Helper: execute a single chart query ──────────────────────────

    async def _execute_chart_query(
        self,
        chart_def: dict,
        filters: list[SelectedFilter],
        period: PeriodFilter | None,
    ) -> dict:
        """Build and execute a Cube.js query for a single chart."""
        cube = chart_def.get("cube", "casos_novos")
        query: dict[str, Any] = {
            "measures": chart_def.get("measures", []),
        }
        if chart_def.get("dimensions"):
            query["dimensions"] = chart_def["dimensions"]

        # Apply user filters (remap to target cube)
        cube_filters = self._remap_filters(filters, cube)
        if cube_filters:
            query["filters"] = cube_filters

        # Apply period as timeDimension — but skip dateRange when 'ano' is filtered
        # (ano filter + dateRange conflict produces wrong data)
        has_ano = self._filters_have_ano(filters)
        if chart_def.get("time_dimension"):
            td_entry: dict[str, Any] = {
                "dimension": chart_def["time_dimension"],
                "granularity": chart_def.get("granularity", "month"),
            }
            if period:
                td_entry["dateRange"] = [period.date_from, period.date_to]
            elif not has_ano:
                td_entry["dateRange"] = ["2024-01-01", "2026-02-28"]
            # When ano is filtered and no explicit period, omit dateRange
            query["timeDimensions"] = [td_entry]

        query["limit"] = 200
        return await self.cube_client.query(query)

    # ── Helper: execute a single KPI query ────────────────────────────

    async def _execute_kpi_query(
        self,
        kpi_def: dict,
        filters: list[SelectedFilter],
        period: PeriodFilter | None,
    ) -> dict:
        """Execute a simple aggregation query for a KPI card."""
        cube = kpi_def.get("cube", "casos_novos")
        measure = kpi_def.get("measure", f"{cube}.count")

        query: dict[str, Any] = {
            "measures": [measure],
        }

        cube_filters = self._remap_filters(filters, cube)
        if cube_filters:
            query["filters"] = cube_filters

        # Apply period if available — but skip when 'ano' is already filtered
        has_ano = self._filters_have_ano(filters)
        if period and not has_ano:
            time_dim = self._get_time_dimension(cube)
            if time_dim:
                query["timeDimensions"] = [{
                    "dimension": time_dim,
                    "dateRange": [period.date_from, period.date_to],
                }]

        return await self.cube_client.query(query)

    # ── Helper: remap filters to target cube ──────────────────────────

    # Dimensions that are numeric type in Cube — filter values must be unquoted
    _NUMERIC_DIMS = {"ano", "mes"}

    def _remap_filters(
        self, filters: list[SelectedFilter], target_cube: str
    ) -> list[dict]:
        """Remap user filters to a target cube, using shared dimension names.
        Filters with empty values are skipped (equals+[] would match nothing)."""
        remapped = []
        for f in filters:
            # Skip filters without selected values — they would filter out ALL rows
            if not f.values:
                continue
            parts = f.dimension.split(".")
            if len(parts) == 2:
                dim_name = parts[1]
                if dim_name in SHARED_DIMENSIONS:
                    remapped.append({
                        "member": f"{target_cube}.{dim_name}",
                        "operator": f.operator,
                        "values": f.values,
                    })
        return remapped

    @staticmethod
    def _filters_have_ano(filters: list[SelectedFilter]) -> bool:
        """Return True if any filter targets the 'ano' dimension."""
        for f in filters:
            if not f.values:
                continue
            dim = f.dimension.split(".")[-1] if "." in f.dimension else f.dimension
            if dim == "ano":
                return True
        return False

    # ── Helper: get time dimension for a cube ─────────────────────────

    @staticmethod
    def _get_time_dimension(cube: str) -> str | None:
        """Return the main time dimension for a cube."""
        mapping = {
            "casos_novos": "casos_novos.data_referencia",
            "casos_baixados": "casos_baixados.data_referencia",
            "casos_pendentes": "casos_pendentes.data_ajuizamento",
            "sentencas": "sentencas.data_referencia",
            "datamart": "datamart.data_ajuizamento",
        }
        return mapping.get(cube)
    # ── Helper: fetch sparkline data for KPIs ───────────────────────────

    async def _fetch_sparkline(
        self,
        kpi_def: dict,
        filters: list[SelectedFilter],
    ) -> list[float]:
        """Fetch last ~12 data points for a KPI grouped by ano (or month).
        Returns a list of numeric values for the sparkline SVG."""
        cube = kpi_def.get("cube", "casos_novos")
        measure = kpi_def.get("measure", f"{cube}.count")
        try:
            query: dict[str, Any] = {
                "measures": [measure],
                "dimensions": [f"{cube}.ano"],
                "order": {f"{cube}.ano": "asc"},
                "limit": 12,
            }
            cube_filters = self._remap_filters(filters, cube)
            if cube_filters:
                query["filters"] = cube_filters
            result = await self.cube_client.query(query)
            data = result.get("data", [])
            return [float(row.get(measure, 0) or 0) for row in data]
        except Exception as e:
            logger.warning("[Sparkline] Failed for %s: %s", measure, e)
            return []

    # ── Helper: create a single chart definition for a given type ───────

    @staticmethod
    def _make_chart_def(chart_type: str, cube: str, measure: str, *,
                        dimension_filters: list[dict] | None = None) -> dict:
        """Create a sensible chart definition for a given chart type."""
        metric_titles = {
            "casos_novos.count": "Casos Novos",
            "casos_baixados.count": "Baixas",
            "sentencas.count": "Sentencas",
            "casos_pendentes.count": "Pendentes",
            "datamart.count": "Processos",
        }
        label = metric_titles.get(measure, measure.split(".")[-1].title())

        time_dim_map = {
            "casos_novos": f"{cube}.data_referencia",
            "casos_baixados": f"{cube}.data_referencia",
            "casos_pendentes": f"{cube}.data_ajuizamento",
            "sentencas": f"{cube}.data_referencia",
            "datamart": f"{cube}.data_ajuizamento",
        }
        time_dim = time_dim_map.get(cube, f"{cube}.data_referencia")

        # Pick best categorical dimension from dimension_filters or default
        cat_dim = f"{cube}.nome_ultima_classe"
        if dimension_filters:
            for d in dimension_filters:
                dim = d.get("dimension", "")
                if dim.startswith(f"{cube}."):
                    cat_dim = dim
                    break
                elif "." in dim:
                    dim_name = dim.split(".")[-1]
                    if dim_name in SHARED_DIMENSIONS:
                        cat_dim = f"{cube}.{dim_name}"
                        break

        dim_label = cat_dim.split(".")[-1].replace("_", " ").title()

        _CHART_DESCRIPTIONS = {
            "line": "Evolução temporal de {m}",
            "area": "Área de evolução de {m} ao longo do tempo",
            "stacked_area": "Área empilhada de {m} ao longo do tempo",
            "pie": "Distribuição de {m} por {d}",
            "donut": "Distribuição de {m} por {d}",
            "horizontal_bar": "Comparação horizontal de {m} por {d}",
            "stacked_bar": "Barras empilhadas de {m} por {d}",
            "grouped_bar": "Barras agrupadas de {m} por {d}",
            "gauge": "Indicador de {m}",
            "funnel": "Funil de {m} por {d}",
            "treemap": "Mapa de árvore de {m} por {d}",
            "radar": "Perfil radar de {m} por {d}",
            "waterfall": "Variação em cascata de {m} por {d}",
            "scatter": "Dispersão de {m} por {d}",
            "heatmap": "Mapa de calor de {m}",
            "bar": "Gráfico de barras de {m} por {d}",
            "table": "Tabela de {m} por {d}",
        }

        desc_template = _CHART_DESCRIPTIONS.get(chart_type, "Gráfico de {m} por {d}")
        description = desc_template.format(m=label, d=dim_label)

        # Time-based charts
        if chart_type in ("line", "area", "stacked_area"):
            return {
                "chart_type": chart_type,
                "title": f"Evolucao Mensal de {label}",
                "description": description,
                "cube": cube,
                "measures": [measure],
                "dimensions": [],
                "time_dimension": time_dim,
                "granularity": "month",
                "span": "col-6",
            }
        # Circular charts
        if chart_type in ("pie", "donut"):
            return {
                "chart_type": chart_type,
                "title": f"Distribuicao de {label} por {dim_label}",
                "description": description,
                "cube": cube,
                "measures": [measure],
                "dimensions": [cat_dim],
                "span": "col-6",
            }
        # Horizontal bar
        if chart_type == "horizontal_bar":
            return {
                "chart_type": "horizontal_bar",
                "title": f"{label} por {dim_label}",
                "description": description,
                "cube": cube,
                "measures": [measure],
                "dimensions": [cat_dim],
                "span": "col-6",
            }
        # Stacked/grouped bar
        if chart_type in ("stacked_bar", "grouped_bar"):
            return {
                "chart_type": chart_type,
                "title": f"{label} por {dim_label}",
                "description": description,
                "cube": cube,
                "measures": [measure],
                "dimensions": [cat_dim],
                "span": "col-6",
            }
        # Gauge (single value)
        if chart_type == "gauge":
            return {
                "chart_type": "gauge",
                "title": f"{label}",
                "description": description,
                "cube": cube,
                "measures": [measure],
                "dimensions": [],
                "span": "col-4",
            }
        # Funnel
        if chart_type == "funnel":
            return {
                "chart_type": "funnel",
                "title": f"{label} por {dim_label}",
                "description": description,
                "cube": cube,
                "measures": [measure],
                "dimensions": [cat_dim],
                "span": "col-6",
            }
        # Treemap
        if chart_type == "treemap":
            return {
                "chart_type": "treemap",
                "title": f"{label} por {dim_label}",
                "description": description,
                "cube": cube,
                "measures": [measure],
                "dimensions": [cat_dim],
                "span": "col-6",
            }
        # Radar
        if chart_type == "radar":
            return {
                "chart_type": "radar",
                "title": f"Perfil de {label}",
                "description": description,
                "cube": cube,
                "measures": [measure],
                "dimensions": [cat_dim],
                "span": "col-6",
            }
        # Waterfall
        if chart_type == "waterfall":
            return {
                "chart_type": "waterfall",
                "title": f"Variacao de {label}",
                "description": description,
                "cube": cube,
                "measures": [measure],
                "dimensions": [cat_dim],
                "span": "col-6",
            }
        # Scatter
        if chart_type == "scatter":
            return {
                "chart_type": "scatter",
                "title": f"Dispersao de {label}",
                "description": description,
                "cube": cube,
                "measures": [measure],
                "dimensions": [cat_dim],
                "span": "col-6",
            }
        # Heatmap
        if chart_type == "heatmap":
            return {
                "chart_type": "heatmap",
                "title": f"{label} — Mapa de Calor",
                "description": description,
                "cube": cube,
                "measures": [measure],
                "dimensions": [f"{cube}.grau", cat_dim],
                "span": "col-12",
            }
        # Default: bar / table
        return {
            "chart_type": chart_type,
            "title": f"{label} por {dim_label}",
            "description": description,
            "cube": cube,
            "measures": [measure],
            "dimensions": [cat_dim],
            "span": "col-6",
        }

    # ── Helper: validate LLM design ───────────────────────────────────

    def _validate_design(
        self,
        design: dict,
        metrics: list[SelectedMetric],
        chart_types: list[str] | None,
    ) -> dict | None:
        """Validate LLM design: ensure charts have valid measures and structure.
        Returns cleaned design or None if entirely invalid."""

        VALID_CUBES = {"casos_novos", "casos_baixados", "casos_pendentes", "sentencas", "datamart"}
        # Use only user-selected metrics for validation (not ALL_METRICS)
        user_measures = {m.name for m in metrics} if metrics else {m["name"] for m in ALL_METRICS}

        charts = design.get("charts", [])
        if not charts:
            logger.warning("[Step4] LLM design has no charts")
            return None

        valid_charts = []
        for cd in charts:
            # Must have measures
            measures = cd.get("measures", [])
            if not measures:
                logger.warning("[Step4] Chart '%s' has no measures, skipping", cd.get("title"))
                continue

            # Validate cube name
            cube = cd.get("cube", "")
            if cube not in VALID_CUBES:
                inferred = measures[0].split(".")[0] if measures else None
                if inferred in VALID_CUBES:
                    cd["cube"] = inferred
                    logger.info("[Step4] Fixed cube from '%s' to '%s'", cube, inferred)
                else:
                    logger.warning("[Step4] Invalid cube '%s' in chart '%s', skipping", cube, cd.get("title"))
                    continue

            # Validate measures exist in user selection
            bad_measures = [m for m in measures if m not in user_measures]
            if bad_measures:
                logger.warning("[Step4] Invalid measures %s in chart '%s', skipping", bad_measures, cd.get("title"))
                continue

            # Validate chart_type against catalog
            if cd.get("chart_type") not in VALID_CHART_TYPES:
                cd["chart_type"] = "bar"

            # Validate dimensions belong to the cube
            cube_name = cd.get("cube", "")
            valid_dims = []
            for dim in cd.get("dimensions", []):
                if "." in dim:
                    dim_cube = dim.split(".")[0]
                    dim_name = dim.split(".")[1]
                    if dim_cube != cube_name and dim_name in SHARED_DIMENSIONS:
                        valid_dims.append(f"{cube_name}.{dim_name}")
                        logger.info("[Step4] Remapped dim '%s' to '%s.%s'", dim, cube_name, dim_name)
                    else:
                        valid_dims.append(dim)
                else:
                    valid_dims.append(f"{cube_name}.{dim}")
            cd["dimensions"] = valid_dims

            valid_charts.append(cd)

        if not valid_charts:
            logger.warning("[Step4] No valid charts after validation")
            return None

        design["charts"] = valid_charts

        # Validate KPIs — only allow user-selected measures
        kpis = design.get("kpis", [])
        valid_kpis = [k for k in kpis if k.get("measure") in user_measures]
        design["kpis"] = valid_kpis

        return design

    # ── Helper: pre-flight validation of metrics ──────────────────────

    async def _preflight_validate_metrics(
        self,
        metrics: list[SelectedMetric],
        filters: list[SelectedFilter],
        period: PeriodFilter | None,
    ) -> list[SelectedMetric]:
        """Query each metric with a simple aggregation to check if it returns non-zero data.
        Returns only metrics that have actual data."""

        async def check_metric(m: SelectedMetric) -> tuple[SelectedMetric, bool]:
            cube = m.name.split(".")[0]
            query: dict = {"measures": [m.name], "limit": 1}

            # Apply user filters
            cube_filters = self._remap_filters(filters, cube)
            if cube_filters:
                query["filters"] = cube_filters

            # Apply period if available
            if period:
                time_dim = self._get_time_dimension(cube)
                if time_dim:
                    query["timeDimensions"] = [{
                        "dimension": time_dim,
                        "dateRange": [period.date_from, period.date_to],
                    }]

            try:
                result = await self.cube_client.query(query)
                data = result.get("data", [])
                if not data:
                    logger.warning("[Preflight] Metric %s returned no data", m.name)
                    return (m, False)
                value = data[0].get(m.name, 0)
                has_data = value is not None and float(value) != 0
                logger.info("[Preflight] Metric %s = %s (has_data=%s)", m.name, value, has_data)
                return (m, has_data)
            except Exception as e:
                logger.warning("[Preflight] Failed to validate metric %s: %s", m.name, e)
                return (m, True)  # Assume valid on error — don't block

        results = await asyncio.gather(*[check_metric(m) for m in metrics])
        return [m for m, ok in results if ok]

    # ── Helper: fallback design if LLM fails ──────────────────────────

    @staticmethod
    def _fallback_design(
        primary_cube: str,
        primary_metric: str,
        metric_names: list[str],
        chart_types: list[str] | None = None,
        filter_dims: list[str] | None = None,
    ) -> dict:
        """Generate a reasonable default dashboard design based on user selections."""
        # Determine best dimension for categorical charts
        dim_priority = ["grau", "nome_orgao", "nome_ultima_classe", "uf", "formato"]
        cat_dim = "grau"  # safe default — always few values
        if filter_dims:
            cat_dim = filter_dims[0]
        else:
            for d in dim_priority:
                cat_dim = d
                break

        # Pick chart types from user selection or sensible defaults
        types = chart_types or ["bar", "line", "pie"]
        # Ensure we have 3 types; cycle if fewer
        while len(types) < 3:
            types = types + ["bar"]
        types = types[:3]

        # Human-readable titles based on dimension
        dim_titles = {
            "grau": "Grau", "nome_orgao": "Orgao Julgador",
            "nome_ultima_classe": "Classe Processual", "uf": "UF",
            "formato": "Formato", "procedimento": "Procedimento",
            "municipio": "Municipio", "poder_publico": "Poder Publico",
        }
        metric_titles = {
            "casos_novos.count": "Casos Novos",
            "casos_novos.processos_distintos": "Processos Distintos",
            "casos_baixados.count": "Baixas",
            "sentencas.count": "Sentencas",
            "casos_pendentes.count": "Pendentes",
            "datamart.count": "Processos",
        }
        metric_label = metric_titles.get(primary_metric, primary_metric.split(".")[-1])
        dim_label = dim_titles.get(cat_dim, cat_dim)

        charts = []
        for i, ct in enumerate(types):
            if ct == "line":
                charts.append({
                    "chart_type": "line",
                    "title": f"Evolucao Mensal de {metric_label}",
                    "cube": primary_cube,
                    "measures": [primary_metric],
                    "dimensions": [],
                    "time_dimension": f"{primary_cube}.data_referencia",
                    "granularity": "month",
                    "span": "col-6" if i < 2 else "col-12",
                })
            elif ct == "pie":
                charts.append({
                    "chart_type": "pie",
                    "title": f"{metric_label} por {dim_label}",
                    "cube": primary_cube,
                    "measures": [primary_metric],
                    "dimensions": [f"{primary_cube}.{cat_dim}"],
                    "span": "col-6" if i < 2 else "col-12",
                })
            else:  # bar (default)
                charts.append({
                    "chart_type": "bar",
                    "title": f"{metric_label} por {dim_label}",
                    "cube": primary_cube,
                    "measures": [primary_metric],
                    "dimensions": [f"{primary_cube}.{cat_dim}"],
                    "span": "col-6" if i < 2 else "col-12",
                })

        # Adjust spans to sum to 12
        if len(charts) == 3:
            charts[0]["span"] = "col-6"
            charts[1]["span"] = "col-6"
            charts[2]["span"] = "col-12"

        kpis = [
            {
                "label": metric_label,
                "measure": primary_metric,
                "cube": primary_cube,
            },
        ]
        if len(metric_names) > 1:
            secondary = metric_names[1]
            sec_label = metric_titles.get(secondary, secondary.split(".")[-1])
            kpis.append({
                "label": sec_label,
                "measure": secondary,
                "cube": secondary.split(".")[0],
            })
        else:
            kpis.append({
                "label": f"{metric_label} (total)",
                "measure": primary_metric,
                "cube": primary_cube,
            })

        return {
            "title": f"Painel de {metric_label}",
            "charts": charts,
            "kpis": kpis,
        }

    # ── Re-query: re-execute queries with new filter values ───────────

    async def requery_dashboard(
        self,
        chart_defs: list[dict],
        kpi_defs: list[dict],
        filters: list[SelectedFilter],
        period: PeriodFilter | None,
        title: str = "Painel Analitico",
    ) -> Step4Response:
        """Re-execute all chart and KPI queries with updated filter values."""

        # Smart span adjustment
        self._adjust_spans(chart_defs)

        chart_tasks = [self._execute_chart_query(cd, filters, period) for cd in chart_defs]
        kpi_tasks = [self._execute_kpi_query(kd, filters, period) for kd in kpi_defs]

        results = await asyncio.gather(*chart_tasks, *kpi_tasks, return_exceptions=True)
        charts_results = results[:len(chart_defs)]
        kpis_results = results[len(chart_defs):]

        # Assemble using shared logic
        charts = self._assemble_charts(chart_defs, charts_results)
        kpis = self._assemble_kpis(kpi_defs, kpis_results)

        # Fetch sparkline data for each KPI
        sparkline_tasks = [self._fetch_sparkline(kd, filters) for kd in kpi_defs]
        sparkline_results = await asyncio.gather(*sparkline_tasks, return_exceptions=True)
        for ki, spark in enumerate(sparkline_results):
            if ki < len(kpis) and isinstance(spark, list) and len(spark) > 1:
                kpis[ki]["sparkline"] = spark

        return Step4Response(
            title=title,
            kpis=kpis,
            charts=charts,
            chart_defs=chart_defs,
            kpi_defs=kpi_defs,
        )
