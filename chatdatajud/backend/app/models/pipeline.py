"""Pydantic models for the Dashboard Builder Pipeline (4-step)."""

from typing import Any

from pydantic import BaseModel


# ── Step 1: Filters ────────────────────────────────────────────

class FilterDimensionWithValues(BaseModel):
    """A single dimension available for filtering, with its distinct values."""
    name: str                       # e.g. "grau"
    title: str                      # e.g. "Grau"
    cube: str                       # e.g. "casos_novos"
    type: str                       # "string" | "number" | "time"
    values: list[str] = []          # e.g. ["G1", "G2", "JE"]


class Step1Response(BaseModel):
    """Available filter dimensions with distinct values."""
    dimensions: list[FilterDimensionWithValues]
    suggested: list[str] = []       # dimension names suggested by default


class SelectedFilter(BaseModel):
    """A filter the user has chosen."""
    dimension: str                  # e.g. "casos_novos.grau"
    operator: str = "equals"
    values: list[str]               # e.g. ["G1"]


class PeriodFilter(BaseModel):
    """Date range selected by the user."""
    date_from: str                  # "YYYY-MM-DD"
    date_to: str                    # "YYYY-MM-DD"


# ── Step 2: Metrics ───────────────────────────────────────────

class MetricOption(BaseModel):
    """A measure available for selection."""
    name: str                       # e.g. "casos_novos.count"
    title: str                      # e.g. "Total de Casos"
    cube: str                       # e.g. "casos_novos"
    type: str                       # "count", "avg", "sum", etc.


class Step2Request(BaseModel):
    """Input for step 2: user's chosen filters + period."""
    filters: list[SelectedFilter]
    period: PeriodFilter | None = None
    model: str = "meta-llama/llama-3.3-70b-instruct:free"


class Step2Response(BaseModel):
    """Available metrics + AI suggestions."""
    all_metrics: list[MetricOption]
    suggested_metrics: list[str]    # names of the 2 AI-suggested metrics
    suggestion_reasoning: str       # short LLM explanation


class SelectedMetric(BaseModel):
    """A metric the user confirmed."""
    name: str                       # e.g. "casos_novos.count"


# ── Step 3: Chart Types ──────────────────────────────────────

class Step3Request(BaseModel):
    """Input for step 3: filters + confirmed metrics."""
    filters: list[SelectedFilter]
    metrics: list[SelectedMetric]
    model: str = "meta-llama/llama-3.3-70b-instruct:free"


class Step3Response(BaseModel):
    """AI-suggested chart types."""
    suggested_chart_types: list[str]  # ["bar", "line", "pie"]
    reasoning: str = ""               # short explanation


# ── Step 4: Dashboard Generation ──────────────────────────────

class Step4Request(BaseModel):
    """Input for step 4: filters + period + confirmed metrics + chart types."""
    filters: list[SelectedFilter]
    period: PeriodFilter | None = None
    metrics: list[SelectedMetric]
    chart_types: list[str] = []     # e.g. ["bar", "line", "pie"]
    model: str = "meta-llama/llama-3.3-70b-instruct:free"


class Step4Response(BaseModel):
    """Fully rendered dashboard payload."""
    title: str
    kpis: list[dict]                # KPIPayload-compatible dicts
    charts: list[dict]              # ChartPayload-compatible dicts with ECharts options
    dimension_filters: list[dict] = []  # Available filter dimensions for dashboard UI
    chart_defs: list[dict] = []     # Raw chart definitions for re-query
    kpi_defs: list[dict] = []       # Raw KPI definitions for re-query


# ── Dashboard Generation (from BI Agent) ──────────────────────

class DashboardGenerateRequest(BaseModel):
    """Input from BI Agent workspace_ready event."""
    filters: list[dict]             # [{"dimension": "...", "title": "..."}]
    metrics: list[str]              # ["casos_novos.count", "sentencas.count"]
    chart_types: list[Any]          # ["bar"] or [{"type": "bar", "description": "..."}]
    period: PeriodFilter | None = None
    title: str | None = None
    model: str = "meta-llama/llama-3.3-70b-instruct:free"


class ReQueryRequest(BaseModel):
    """Input for dashboard re-query with changed filters."""
    chart_defs: list[dict]          # Original chart definitions
    kpi_defs: list[dict] = []       # Original KPI definitions
    filters: list[dict] = []        # [{"dimension": "...", "operator": "equals", "values": [...]}]
    period: PeriodFilter | None = None
    title: str = "Painel Analitico"
