"""
Chart Catalog — registry of all available chart types with metadata.

The LLM receives this catalog in the Step 4 prompt so it can choose the
best visualization for each user request.  The chart_builder uses it to
know which ECharts configuration to generate.
"""

from __future__ import annotations

CHART_CATALOG: list[dict] = [
    # ── Cartesian / categorical ──────────────────────────────────────
    {
        "type": "bar",
        "label": "Barras Verticais",
        "description": "Comparar valores entre categorias (grau, classe, órgão).",
        "data_shape": "1 dimensão categórica + 1 medida",
        "supports_time": False,
        "echarts_type": "bar",
        "extra": {},
    },
    {
        "type": "horizontal_bar",
        "label": "Barras Horizontais",
        "description": "Comparar categorias com nomes longos (classes processuais, nomes de varas). Melhor quando há muitas categorias.",
        "data_shape": "1 dimensão categórica + 1 medida",
        "supports_time": False,
        "echarts_type": "bar",
        "extra": {"orientation": "horizontal"},
    },
    {
        "type": "stacked_bar",
        "label": "Barras Empilhadas",
        "description": "Comparar composição de partes num total ao longo de categorias. Ideal para mostrar distribuição.",
        "data_shape": "1 dimensão categórica + 1 medida + 1 dimensão de série",
        "supports_time": True,
        "echarts_type": "bar",
        "extra": {"stack": True},
    },
    {
        "type": "grouped_bar",
        "label": "Barras Agrupadas",
        "description": "Comparar múltiplas séries lado a lado para cada categoria.",
        "data_shape": "1 dimensão categórica + 1 medida + 1 dimensão de série",
        "supports_time": False,
        "echarts_type": "bar",
        "extra": {"grouped": True},
    },
    # ── Line / Area ──────────────────────────────────────────────────
    {
        "type": "line",
        "label": "Linha",
        "description": "Evolução temporal. Ideal para séries mensais, anuais e tendências.",
        "data_shape": "1 dimensão temporal + 1 medida",
        "supports_time": True,
        "echarts_type": "line",
        "extra": {},
    },
    {
        "type": "area",
        "label": "Área",
        "description": "Evolução temporal com preenchimento. Destaca o volume ao longo do tempo.",
        "data_shape": "1 dimensão temporal + 1 medida",
        "supports_time": True,
        "echarts_type": "line",
        "extra": {"area": True},
    },
    {
        "type": "stacked_area",
        "label": "Área Empilhada",
        "description": "Composição de múltiplas séries ao longo do tempo mostrando proporção do total.",
        "data_shape": "1 dimensão temporal + 1 medida + 1 dimensão de série",
        "supports_time": True,
        "echarts_type": "line",
        "extra": {"area": True, "stack": True},
    },
    # ── Circular ─────────────────────────────────────────────────────
    {
        "type": "pie",
        "label": "Pizza",
        "description": "Distribuição proporcional simples entre ≤10 categorias.",
        "data_shape": "1 dimensão categórica + 1 medida",
        "supports_time": False,
        "echarts_type": "pie",
        "extra": {},
    },
    {
        "type": "donut",
        "label": "Rosca (Donut)",
        "description": "Distribuição proporcional com total no centro. Mais moderno que pizza.",
        "data_shape": "1 dimensão categórica + 1 medida",
        "supports_time": False,
        "echarts_type": "pie",
        "extra": {"donut": True},
    },
    # ── Especiais ────────────────────────────────────────────────────
    {
        "type": "scatter",
        "label": "Dispersão",
        "description": "Correlação entre 2 medidas numéricas. Identifica outliers e padrões.",
        "data_shape": "2 medidas numéricas + dimensão categórica opcional",
        "supports_time": False,
        "echarts_type": "scatter",
        "extra": {},
    },
    {
        "type": "radar",
        "label": "Radar",
        "description": "Comparar múltiplas dimensões de performance num polígono. Bom para perfil de desempenho.",
        "data_shape": "3+ medidas + 1 ou mais categorias",
        "supports_time": False,
        "echarts_type": "radar",
        "extra": {},
    },
    {
        "type": "funnel",
        "label": "Funil",
        "description": "Etapas sequenciais com taxa de conversão. Mostra afunilamento de volume.",
        "data_shape": "1 dimensão categórica + 1 medida",
        "supports_time": False,
        "echarts_type": "funnel",
        "extra": {},
    },
    {
        "type": "gauge",
        "label": "Velocímetro (Gauge)",
        "description": "Indicador único vs. meta. Ideal para taxa de congestionamento, cumprimento de meta.",
        "data_shape": "1 medida (valor único)",
        "supports_time": False,
        "echarts_type": "gauge",
        "extra": {},
    },
    {
        "type": "heatmap",
        "label": "Mapa de Calor",
        "description": "Padrões entre 2 dimensões categóricas. Ideal para mês × grau, vara × classe.",
        "data_shape": "2 dimensões categóricas + 1 medida",
        "supports_time": True,
        "echarts_type": "heatmap",
        "extra": {},
    },
    {
        "type": "treemap",
        "label": "Treemap",
        "description": "Hierarquia proporcional em retângulos. Bom para distribuição por classe/subclasse.",
        "data_shape": "1 dimensão categórica + 1 medida",
        "supports_time": False,
        "echarts_type": "treemap",
        "extra": {},
    },
    {
        "type": "waterfall",
        "label": "Cascata (Waterfall)",
        "description": "Contribuição incremental de cada parte ao total. Bom para variação acumulada.",
        "data_shape": "1 dimensão categórica + 1 medida",
        "supports_time": False,
        "echarts_type": "bar",
        "extra": {"waterfall": True},
    },
    # ── Tabela ───────────────────────────────────────────────────────
    {
        "type": "table",
        "label": "Tabela",
        "description": "Listagem detalhada de dados, rankings, comparações linha a linha.",
        "data_shape": "múltiplas dimensões e medidas",
        "supports_time": False,
        "echarts_type": "table",
        "extra": {},
    },
]

# Fast lookup by type
CATALOG_BY_TYPE: dict[str, dict] = {c["type"]: c for c in CHART_CATALOG}

# All valid chart type strings
VALID_CHART_TYPES: set[str] = {c["type"] for c in CHART_CATALOG}


def catalog_for_prompt() -> str:
    """Format the catalog as a readable string for LLM prompt injection."""
    lines = []
    for c in CHART_CATALOG:
        lines.append(f"- **{c['type']}** ({c['label']}): {c['description']}  Dados: {c['data_shape']}")
    return "\n".join(lines)
