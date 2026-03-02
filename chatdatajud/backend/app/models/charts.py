from pydantic import BaseModel
from typing import Optional


class ChartPayload(BaseModel):
    chart_type: str  # "bar" | "line" | "pie" | "table"
    title: str
    option: dict  # ECharts option JSON
    height: Optional[int] = 300


class KPIPayload(BaseModel):
    title: str
    value: str
    label: str
    change: Optional[str] = None
    change_direction: Optional[str] = None  # "up" | "down"


class DashboardPayload(BaseModel):
    title: str
    kpis: list[KPIPayload] = []
    charts: list[ChartPayload] = []
