"""Tool definitions for the AI agent (ReAct pattern via OpenRouter / OpenAI-compatible API)."""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "query_cube",
            "description": (
                "FERRAMENTA OBRIGATÓRIA para qualquer análise. Executa uma query no Cube.js/Datajud. "
                "Você DEVE fornecer SEMPRE o parâmetro 'measures' (obrigatório). Sem measures, a query falha!"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "measures": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "OBRIGATÓRIO! Lista de medidas a consultar. Exemplos: ['casos_novos.count'], ['casos_baixados.count'], ['sentencas.count']",
                    },
                    "dimensions": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Opcional. Dimensões para agrupar. Ex: ['casos_novos.mes', 'casos_novos.ano']",
                    },
                    "filters": {
                        "type": "array",
                        "items": {"type": "object"},
                        "description": "Opcional. Filtros: [{member: 'casos_novos.ano', operator: 'equals', values: [2025]}]",
                    },
                    "timeDimensions": {
                        "type": "array",
                        "items": {"type": "object"},
                        "description": (
                            "Opcional. Dimensão de tempo. ATENÇÃO: use APENAS dimensões de tempo válidas do schema! "
                            "Exemplos CORRETOS: "
                            "[{dimension: 'casos_novos.data_referencia', dateRange: ['2025-01-01', '2025-12-31'], granularity: 'month'}], "
                            "[{dimension: 'casos_baixados.data_referencia', dateRange: ['2025-01-01', '2025-12-31'], granularity: 'month'}], "
                            "[{dimension: 'sentencas.data_referencia', dateRange: ['2025-01-01', '2025-12-31'], granularity: 'month'}], "
                            "[{dimension: 'datamart.data_ajuizamento', dateRange: ['2025-01-01', '2025-12-31'], granularity: 'month'}]. "
                            "NUNCA use 'casos_novos.data' — esse campo NÃO EXISTE."
                        ),
                    },
                    "order": {
                        "type": "object",
                        "description": "Opcional. Ordenação: {'casos_novos.count': 'desc'}",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Opcional. Limite de resultados (default: 100)",
                    },
                },
                "required": ["measures"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "configure_chart",
            "description": (
                "Gera a configuração visual (Apache ECharts) para os dados obtidos. "
                "Use após obter dados via query_cube. "
                "O frontend renderiza usando echarts-for-react com cores do tema via placeholders {{token}}."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "chart_type": {
                        "type": "string",
                        "enum": ["bar", "horizontal_bar", "stacked_bar", "grouped_bar",
                                 "line", "area", "stacked_area",
                                 "pie", "donut",
                                 "scatter", "radar", "funnel", "gauge",
                                 "heatmap", "treemap", "waterfall",
                                 "table", "kpi_grid"],
                        "description": "Tipo de gráfico",
                    },
                    "title": {
                        "type": "string",
                        "description": "Título do gráfico",
                    },
                    "data": {
                        "type": "array",
                        "description": "Dados brutos vindos do query_cube",
                    },
                    "x_field": {
                        "type": "string",
                        "description": "Campo para eixo X/categorias",
                    },
                    "y_field": {
                        "type": "string",
                        "description": "Campo para eixo Y/valores",
                    },
                    "series_field": {
                        "type": "string",
                        "description": "Campo para séries múltiplas (opcional)",
                    },
                },
                "required": ["chart_type", "title", "data"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "explore_schema",
            "description": (
                "Lista os cubes, dimensões e medidas disponíveis no Datajud. "
                "Use quando não souber qual cube ou dimensão consultar, ou para responder "
                "'quais dados existem?'"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "cube_name": {
                        "type": "string",
                        "description": "Nome específico do cube para detalhar (opcional). "
                        "Se omitido, lista todos.",
                    }
                },
            },
        },
    },
]

# ── Calculate Tool ─────────────────────────────────────────────────────
# Allows the agent to perform calculations on data returned by query_cube

CALCULATE_TOOL = {
    "type": "function",
    "function": {
        "name": "calculate",
        "description": (
            "Realiza cálculos matemáticos sobre dados retornados pelo query_cube. "
            "Use para: taxas (congestionamento, resolução), variações percentuais, "
            "proporções, médias ponderadas, somas parciais, etc. "
            "O agente NÃO deve fazer cálculos mentalmente — use ESTA ferramenta."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "operation": {
                    "type": "string",
                    "enum": [
                        "ratio",           # A / B
                        "percentage",      # (A / B) * 100
                        "delta",           # A - B
                        "delta_percent",   # ((A - B) / B) * 100
                        "sum",             # sum of values
                        "average",         # mean of values
                        "weighted_average",# weighted mean
                        "min_max",         # min and max
                        "proportion",      # each value / total * 100
                        "custom",          # custom expression
                    ],
                    "description": "Tipo de operação a realizar.",
                },
                "values_a": {
                    "type": "array",
                    "items": {"type": "number"},
                    "description": "Lista de valores numéricos (operando A). Ex: [1500, 2300]",
                },
                "values_b": {
                    "type": "array",
                    "items": {"type": "number"},
                    "description": "Lista de valores numéricos (operando B) — para ratio, percentage, delta. Opcional.",
                },
                "labels": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Labels correspondentes aos valores (para contexto no resultado). Opcional.",
                },
                "label": {
                    "type": "string",
                    "description": "Label descritivo do cálculo. Ex: 'Taxa de Congestionamento'",
                },
                "expression": {
                    "type": "string",
                    "description": "Expressão Python para operação 'custom'. Variáveis: a (values_a), b (values_b). Ex: 'sum(a) / (sum(a) + sum(b)) * 100'",
                },
            },
            "required": ["operation", "values_a"],
        },
    },
}

# ── Compare Periods Tool ──────────────────────────────────────────────

COMPARE_PERIODS_TOOL = {
    "type": "function",
    "function": {
        "name": "compare_periods",
        "description": (
            "Compara dados de dois períodos automaticamente. "
            "Faz duas queries ao Cube.js (período atual e anterior) e calcula variação absoluta e percentual. "
            "Ideal para: 'compare este trimestre com o anterior', 'evolução ano a ano', etc."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "measure": {
                    "type": "string",
                    "description": "Medida a comparar. Ex: 'casos_novos.count'",
                },
                "time_dimension": {
                    "type": "string",
                    "description": "Dimensão temporal. Ex: 'casos_novos.data_referencia'",
                },
                "period_a": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Período A (mais recente) como [date_from, date_to]. Ex: ['2025-07-01', '2025-12-31']",
                },
                "period_b": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Período B (anterior) como [date_from, date_to]. Ex: ['2025-01-01', '2025-06-30']",
                },
                "dimensions": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Dimensões para agrupar a comparação. Opcional. Ex: ['casos_novos.grau']",
                },
                "filters": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Filtros adicionais. Opcional.",
                },
            },
            "required": ["measure", "time_dimension", "period_a", "period_b"],
        },
    },
}

# ── Statistical Summary Tool ─────────────────────────────────────────

STATISTICAL_SUMMARY_TOOL = {
    "type": "function",
    "function": {
        "name": "statistical_summary",
        "description": (
            "Gera resumo estatístico de um campo numérico retornado pelo query_cube. "
            "Calcula: total, média, mediana, desvio padrão, mínimo, máximo, quartis (Q1, Q3), "
            "coeficiente de variação e identificação de outliers. "
            "Use para análises aprofundadas e relatórios estatísticos."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "values": {
                    "type": "array",
                    "items": {"type": "number"},
                    "description": "Lista de valores numéricos para análise estatística.",
                },
                "label": {
                    "type": "string",
                    "description": "Nome descritivo do campo. Ex: 'Casos Novos por Órgão'",
                },
                "labels": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Labels correspondentes (para identificar outliers). Opcional.",
                },
            },
            "required": ["values"],
        },
    },
}


# ── Assemble tool sets ────────────────────────────────────────────────

# Add calculate + statistical tools to base TOOLS
TOOLS = TOOLS + [CALCULATE_TOOL, STATISTICAL_SUMMARY_TOOL]

# ── BI Agent Tools ──────────────────────────────────────────────────────
# Same as TOOLS + emit_dashboard_spec for structured dashboard creation

EMIT_DASHBOARD_SPEC_TOOL = {
    "type": "function",
    "function": {
        "name": "emit_dashboard_spec",
        "description": (
            "Emite a especificação final do dashboard quando todas as informações foram coletadas. "
            "Chame APENAS quando tiver: filtros, métricas E tipos de gráfico confirmados pelo usuário."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "filters": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "dimension": {"type": "string", "description": "Nome da dimensão. Ex: 'casos_novos.grau'"},
                            "title": {"type": "string", "description": "Título legível. Ex: 'Grau'"},
                        },
                        "required": ["dimension", "title"],
                    },
                    "description": "Filtros que o painel terá disponíveis para o usuário",
                },
                "metrics": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Métricas selecionadas. Ex: ['casos_novos.count', 'sentencas.count']",
                },
                "chart_types": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "type": {
                                "type": "string",
                                "description": "Tipo do grafico do catalogo: bar, horizontal_bar, stacked_bar, grouped_bar, line, area, stacked_area, pie, donut, scatter, radar, funnel, gauge, heatmap, treemap, waterfall, table",
                            },
                            "description": {
                                "type": "string",
                                "description": "Descricao do que o grafico deve mostrar. Ex: 'Casos novos por grau de jurisdicao'",
                            },
                        },
                        "required": ["type", "description"],
                    },
                    "description": "Tipos de grafico com descricao do que cada um mostra. Ex: [{'type': 'bar', 'description': 'Casos novos por grau'}]",
                },
                "period": {
                    "type": "object",
                    "properties": {
                        "date_from": {"type": "string", "description": "Data início YYYY-MM-DD"},
                        "date_to": {"type": "string", "description": "Data fim YYYY-MM-DD"},
                    },
                    "description": "Período opcional para o dashboard",
                },
                "title": {
                    "type": "string",
                    "description": "Título sugerido para o dashboard",
                },
            },
            "required": ["filters", "metrics", "chart_types"],
        },
    },
}

# BI agent: only query_cube + explore_schema + calculate + statistical_summary + emit_dashboard_spec
# Exclude configure_chart to prevent LLM from generating charts in BI mode
BI_AGENT_TOOLS = [
    t for t in TOOLS if t["function"]["name"] != "configure_chart"
] + [EMIT_DASHBOARD_SPEC_TOOL]

# BI agent: only query_cube + explore_schema + calculate + statistical_summary + emit_dashboard_spec
# Exclude configure_chart to prevent LLM from generating charts in BI mode
BI_AGENT_TOOLS = [
    t for t in TOOLS if t["function"]["name"] != "configure_chart"
] + [EMIT_DASHBOARD_SPEC_TOOL]


# ── Advanced Statistical Tools (Deep Research exclusive) ──────────────

TIME_SERIES_FORECAST_TOOL = {
    "type": "function",
    "function": {
        "name": "time_series_forecast",
        "description": (
            "Analisa uma série temporal e gera previsão (forecast) com intervalos de confiança. "
            "Aplica decomposição sazonal (STL), médias móveis e previsão via Holt-Winters ou tendência linear. "
            "Ideal para: 'prever casos novos nos próximos meses', 'tendência futura de sentenças', etc."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "values": {
                    "type": "array",
                    "items": {"type": "number"},
                    "description": "Valores numéricos da série temporal, ORDENADOS cronologicamente. Ex: [150, 180, 200, ...]",
                },
                "periods": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Labels dos períodos correspondentes (opcional). Ex: ['2024-01', '2024-02', ...]",
                },
                "forecast_steps": {
                    "type": "integer",
                    "description": "Quantos períodos futuros prever (default: 6).",
                },
                "freq": {
                    "type": "string",
                    "enum": ["monthly", "quarterly", "yearly"],
                    "description": "Frequência da série (default: monthly).",
                },
                "label": {
                    "type": "string",
                    "description": "Nome descritivo da série. Ex: 'Casos Novos Mensais'",
                },
            },
            "required": ["values"],
        },
    },
}

CORRELATION_TOOL = {
    "type": "function",
    "function": {
        "name": "correlation_analysis",
        "description": (
            "Calcula correlação entre duas variáveis numéricas. "
            "Retorna correlação de Pearson (linear) e Spearman (monotônica) com p-valores e interpretação. "
            "Ideal para: 'existe correlação entre casos novos e sentenças?', 'relação entre tempo de baixa e volume', etc."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "values_a": {
                    "type": "array",
                    "items": {"type": "number"},
                    "description": "Valores da primeira variável.",
                },
                "values_b": {
                    "type": "array",
                    "items": {"type": "number"},
                    "description": "Valores da segunda variável (mesmo tamanho que values_a).",
                },
                "label_a": {
                    "type": "string",
                    "description": "Nome da primeira variável. Ex: 'Casos Novos'",
                },
                "label_b": {
                    "type": "string",
                    "description": "Nome da segunda variável. Ex: 'Sentenças'",
                },
            },
            "required": ["values_a", "values_b"],
        },
    },
}

HYPOTHESIS_TEST_TOOL = {
    "type": "function",
    "function": {
        "name": "hypothesis_test",
        "description": (
            "Executa testes de hipótese estatísticos. Disponíveis: "
            "t_test (comparar médias de 2 grupos), "
            "mann_whitney (não-paramétrico para 2 grupos), "
            "anova (comparar médias de 3+ grupos), "
            "kruskal (não-paramétrico para 3+ grupos), "
            "chi_squared (associação entre variáveis categóricas), "
            "shapiro (teste de normalidade). "
            "Retorna estatística, p-valor e interpretação."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "test_type": {
                    "type": "string",
                    "enum": ["t_test", "mann_whitney", "anova", "kruskal", "chi_squared", "shapiro"],
                    "description": "Tipo de teste a executar.",
                },
                "values_a": {
                    "type": "array",
                    "items": {"type": "number"},
                    "description": "Valores do grupo A (ou valores a testar para shapiro).",
                },
                "values_b": {
                    "type": "array",
                    "items": {"type": "number"},
                    "description": "Valores do grupo B (para t_test, mann_whitney). Opcional.",
                },
                "groups": {
                    "type": "array",
                    "items": {
                        "type": "array",
                        "items": {"type": "number"},
                    },
                    "description": "Lista de grupos (para anova, kruskal). Cada grupo é um array de números. Ex: [[10,20,30], [40,50,60], [70,80]]",
                },
                "categories": {
                    "type": "array",
                    "items": {
                        "type": "array",
                        "items": {"type": "number"},
                    },
                    "description": "Tabela de contingência (para chi_squared). Cada linha é um array. Ex: [[10, 20], [30, 40]]",
                },
                "alpha": {
                    "type": "number",
                    "description": "Nível de significância (default: 0.05).",
                },
                "label": {
                    "type": "string",
                    "description": "Descrição do teste. Ex: 'Comparação 1º vs 2º Grau'",
                },
            },
            "required": ["test_type", "values_a"],
        },
    },
}

DISTRIBUTION_ANALYSIS_TOOL = {
    "type": "function",
    "function": {
        "name": "distribution_analysis",
        "description": (
            "Analisa a forma da distribuição de dados numéricos. "
            "Calcula: assimetria (skewness), curtose, percentis detalhados, histograma, "
            "testes de normalidade (Shapiro-Wilk, D'Agostino) e ajuste de distribuições (Normal, Exponencial, Log-Normal). "
            "Ideal para: 'como se distribuem os casos por órgão?', 'os dados seguem distribuição normal?'"
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "values": {
                    "type": "array",
                    "items": {"type": "number"},
                    "description": "Valores numéricos para análise.",
                },
                "label": {
                    "type": "string",
                    "description": "Nome descritivo. Ex: 'Casos Novos por Vara'",
                },
                "labels": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Labels correspondentes aos valores (opcional).",
                },
            },
            "required": ["values"],
        },
    },
}

ANOMALY_DETECTION_TOOL = {
    "type": "function",
    "function": {
        "name": "anomaly_detection",
        "description": (
            "Detecta anomalias (outliers) em dados numéricos usando 3 métodos: "
            "zscore (desvios padrão da média), "
            "iqr (método do intervalo interquartil), "
            "isolation_forest (machine learning — ideal para padrões complexos). "
            "Retorna lista de anomalias com scores e resumo."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "values": {
                    "type": "array",
                    "items": {"type": "number"},
                    "description": "Valores numéricos para análise.",
                },
                "labels": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Labels correspondentes (para identificar as anomalias). Ex: nomes de órgãos, classes, etc.",
                },
                "method": {
                    "type": "string",
                    "enum": ["zscore", "iqr", "isolation_forest"],
                    "description": "Método de detecção (default: zscore).",
                },
                "threshold": {
                    "type": "number",
                    "description": "Limiar de sensibilidade. Para zscore: nº de desvios (default: 2.5). Para iqr: multiplicador (default: 1.5).",
                },
                "label": {
                    "type": "string",
                    "description": "Nome descritivo. Ex: 'Volume de Processos por Vara'",
                },
            },
            "required": ["values"],
        },
    },
}

REGRESSION_TOOL = {
    "type": "function",
    "function": {
        "name": "regression_analysis",
        "description": (
            "Ajusta modelo de regressão linear ou polinomial (grau 1 a 3) entre duas variáveis. "
            "Retorna: equação, R², p-valor, coeficientes, resíduos e predições. "
            "Ideal para: 'qual a relação entre ano e volume de casos?', 'prever valor com base em tendência', "
            "'o volume cresce linearmente com o tempo?'"
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "x_values": {
                    "type": "array",
                    "items": {"type": "number"},
                    "description": "Valores da variável independente (X). Ex: [2020, 2021, 2022, 2023, 2024]",
                },
                "y_values": {
                    "type": "array",
                    "items": {"type": "number"},
                    "description": "Valores da variável dependente (Y). Ex: [1500, 1800, 2100, 2500, 2900]",
                },
                "degree": {
                    "type": "integer",
                    "description": "Grau do polinômio (1 = linear, 2 = quadrático, 3 = cúbico). Default: 1. Máximo: 3.",
                },
                "x_label": {
                    "type": "string",
                    "description": "Nome da variável X. Ex: 'Ano'",
                },
                "y_label": {
                    "type": "string",
                    "description": "Nome da variável Y. Ex: 'Casos Novos'",
                },
                "predict_x": {
                    "type": "array",
                    "items": {"type": "number"},
                    "description": "Valores de X para predição futura. Ex: [2025, 2026]",
                },
            },
            "required": ["x_values", "y_values"],
        },
    },
}

# Deep research: all tools + compare_periods + advanced statistical tools
DEEP_RESEARCH_TOOLS = TOOLS + [
    COMPARE_PERIODS_TOOL,
    TIME_SERIES_FORECAST_TOOL,
    CORRELATION_TOOL,
    HYPOTHESIS_TEST_TOOL,
    DISTRIBUTION_ANALYSIS_TOOL,
    ANOMALY_DETECTION_TOOL,
    REGRESSION_TOOL,
]
