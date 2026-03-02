"""Build ECharts options from simple chart config.

Supports 16 chart types: bar, horizontal_bar, stacked_bar, grouped_bar,
line, area, stacked_area, pie, donut, scatter, radar, funnel, gauge,
heatmap, treemap, waterfall, table, kpi_grid.
"""

import logging
from typing import Any

logger = logging.getLogger(__name__)

PALETTE = [
    "#2563EB", "#0891B2", "#059669", "#7C3AED", "#D97706",
    "#0D9488", "#DC2626", "#64748B", "#A855F7", "#EA580C",
]


# ── Main entry point ─────────────────────────────────────────────────

def build_chart_option(config: dict[str, Any]) -> dict[str, Any]:
    chart_type = config.get("chart_type", "bar")
    data = config.get("data", [])
    x_field = config.get("x_field")
    y_field = config.get("y_field")
    series_field = config.get("series_field")

    if isinstance(data, str):
        import json as _json
        try:
            data = _json.loads(data)
            config["data"] = data
        except Exception:
            data = []
    if data and not isinstance(data[0], dict):
        data = []
    if not data:
        return _empty("Sem dados")

    try:
        if chart_type == "pie":
            return _pie(data, x_field, y_field)
        if chart_type == "donut":
            return _pie(data, x_field, y_field, donut=True)
        if chart_type == "horizontal_bar":
            return _cartesian("bar", data, x_field, y_field, series_field, horizontal=True)
        if chart_type == "stacked_bar":
            return _cartesian("bar", data, x_field, y_field, series_field, stack=True)
        if chart_type == "grouped_bar":
            return _cartesian("bar", data, x_field, y_field, series_field)
        if chart_type == "area":
            return _cartesian("line", data, x_field, y_field, series_field, area=True)
        if chart_type == "stacked_area":
            return _cartesian("line", data, x_field, y_field, series_field, area=True, stack=True)
        if chart_type == "line":
            return _cartesian("line", data, x_field, y_field, series_field)
        if chart_type == "scatter":
            return _scatter(data, x_field, y_field)
        if chart_type == "radar":
            return _radar(data, x_field, y_field)
        if chart_type == "funnel":
            return _funnel(data, x_field, y_field)
        if chart_type == "gauge":
            return _gauge(data, y_field)
        if chart_type == "heatmap":
            return _heatmap(data, x_field, y_field, series_field)
        if chart_type == "treemap":
            return _treemap(data, x_field, y_field)
        if chart_type == "waterfall":
            return _waterfall(data, x_field, y_field)
        if chart_type in ("table", "kpi_grid"):
            return {}
        # default: bar
        return _cartesian("bar", data, x_field, y_field, series_field)
    except Exception as e:
        logger.error("Error building %s chart: %s", chart_type, e)
        return _empty("Erro ao renderizar")


# ── Helpers ───────────────────────────────────────────────────────────

def _empty(text: str = "Sem dados") -> dict:
    return {
        "graphic": {
            "type": "text", "left": "center", "top": "center",
            "style": {"text": text, "fontSize": 14, "fill": "#888"},
        }
    }


def _detect(data: list[dict], x: str | None, y: str | None):
    """Auto-detect x (categorical) and y (numeric) fields."""
    keys = list(data[0].keys()) if data else []
    if not x:
        x = next((k for k in keys if isinstance(data[0].get(k), str)), keys[0] if keys else None)
    if not y:
        y = next((k for k in keys if isinstance(data[0].get(k), (int, float))), keys[1] if len(keys) > 1 else None)
    if not x or not y:
        if len(keys) >= 2:
            x, y = x or keys[0], y or keys[1]
    # Verify fields exist in actual data keys
    if data:
        dk = list(data[0].keys())
        if x and x not in dk:
            x = next((k for k in dk if isinstance(data[0].get(k), str)), dk[0] if dk else x)
        if y and y not in dk:
            y = next((k for k in dk if isinstance(data[0].get(k), (int, float))), dk[-1] if dk else y)
    return x, y


# ── Cartesian (bar / line / area) ─────────────────────────────────────

def _cartesian(base: str, data: list[dict], x_field, y_field, series_field, *,
               horizontal: bool = False, stack: bool = False, area: bool = False):
    x_field, y_field = _detect(data, x_field, y_field)
    if not x_field or not y_field:
        return _empty()

    if series_field or stack:
        sf = series_field or x_field
        return _multi(base, data, x_field, y_field, sf,
                      horizontal=horizontal, stack=stack, area=area)

    cats = [str(d.get(x_field, "")) for d in data]
    vals = [float(d.get(y_field, 0)) if d.get(y_field) is not None else 0 for d in data]

    s: dict[str, Any] = {"type": base, "data": vals, "itemStyle": {"color": PALETTE[0]}}
    if base == "bar":
        s["itemStyle"]["borderRadius"] = [0, 0, 3, 3] if horizontal else [3, 3, 0, 0]
    if base == "line":
        s.update(smooth=True, lineStyle={"width": 2}, symbol="circle", symbolSize=5)
    if area:
        s["areaStyle"] = {
            "color": {
                "type": "linear", "x": 0, "y": 0,
                "x2": 1 if horizontal else 0, "y2": 0 if horizontal else 1,
                "colorStops": [
                    {"offset": 0, "color": "rgba(16,185,129,0.25)"},
                    {"offset": 1, "color": "rgba(16,185,129,0)"},
                ],
            }
        }

    ca: dict[str, Any] = {
        "type": "category", "data": cats,
        "axisLabel": {"color": "{{text-secondary}}", "fontSize": 10},
        "axisLine": {"lineStyle": {"color": "{{border}}"}},
        "axisTick": {"show": False},
    }
    va: dict[str, Any] = {
        "type": "value",
        "splitLine": {"lineStyle": {"color": "{{border}}"}},
        "axisLabel": {"color": "{{text-secondary}}", "fontSize": 10},
    }

    if horizontal:
        ca["axisLabel"]["width"] = 90
        ca["axisLabel"]["overflow"] = "truncate"
        return {
            "tooltip": {"trigger": "axis"},
            "grid": {"left": 110, "right": 24, "top": 16, "bottom": 24},
            "xAxis": va, "yAxis": {**ca, "inverse": True}, "series": [s],
        }
    return {
        "tooltip": {"trigger": "axis"},
        "grid": {"left": 56, "right": 16, "top": 16, "bottom": 40},
        "xAxis": ca, "yAxis": va, "series": [s],
    }


def _multi(base: str, data: list[dict], x_field: str, y_field: str, series_field: str, *,
           horizontal: bool = False, stack: bool = False, area: bool = False):
    cats = sorted(set(str(d.get(x_field, "")) for d in data))
    names = sorted(set(str(d.get(series_field, "")) for d in data))
    sarr = []
    for idx, nm in enumerate(names):
        vs = []
        for c in cats:
            row = next((d for d in data
                        if str(d.get(x_field, "")) == c and str(d.get(series_field, "")) == nm), None)
            vs.append(float(row.get(y_field, 0)) if row and row.get(y_field) is not None else 0)
        s: dict[str, Any] = {
            "name": nm, "type": base, "data": vs,
            "itemStyle": {"color": PALETTE[idx % len(PALETTE)]},
        }
        if base == "bar":
            s["itemStyle"]["borderRadius"] = [0, 0, 3, 3] if horizontal else [3, 3, 0, 0]
        if base == "line":
            s.update(smooth=True, symbol="circle", symbolSize=5)
        if stack:
            s["stack"] = "total"
        if area:
            s["areaStyle"] = {"opacity": 0.35}
        sarr.append(s)

    ca: dict[str, Any] = {
        "type": "category", "data": cats,
        "axisLabel": {"color": "{{text-secondary}}", "fontSize": 10},
        "axisLine": {"lineStyle": {"color": "{{border}}"}},
        "axisTick": {"show": False},
    }
    va: dict[str, Any] = {
        "type": "value",
        "splitLine": {"lineStyle": {"color": "{{border}}"}},
        "axisLabel": {"color": "{{text-secondary}}", "fontSize": 10},
    }
    r: dict[str, Any] = {
        "tooltip": {"trigger": "axis"},
        "legend": {
            "data": names, "bottom": 0,
            "textStyle": {"color": "{{text-secondary}}", "fontSize": 11},
            "itemWidth": 8, "itemHeight": 8,
        },
        "grid": {"left": 56, "right": 16, "top": 16, "bottom": 48},
        "series": sarr,
    }
    if horizontal:
        ca["axisLabel"]["width"] = 90
        ca["axisLabel"]["overflow"] = "truncate"
        r["grid"]["left"] = 110
        r["grid"]["bottom"] = 24
        r["xAxis"] = va
        r["yAxis"] = {**ca, "inverse": True}
    else:
        r["xAxis"] = ca
        r["yAxis"] = va
    return r


# ── Pie / Donut ───────────────────────────────────────────────────────

def _pie(data: list[dict], x_field, y_field, *, donut: bool = False):
    x_field, y_field = _detect(data, x_field, y_field)
    if not x_field or not y_field:
        return _empty()
    pd_list = []
    total = 0
    for i, d in enumerate(data):
        v = float(d.get(y_field, 0)) if d.get(y_field) is not None else 0
        total += v
        pd_list.append({
            "name": str(d.get(x_field, "")), "value": v,
            "itemStyle": {"color": PALETTE[i % len(PALETTE)]},
        })
    radius = ["48%", "72%"] if donut else ["0%", "70%"]
    lbl: dict[str, Any] = {"show": False}
    if donut:
        try:
            ts = f"{total:,.0f}".replace(",", ".") if total >= 1000 else str(int(total))
        except Exception:
            ts = str(total)
        lbl = {
            "show": True, "position": "center",
            "formatter": "{total|" + ts + "}\n{sub|Total}",
            "rich": {
                "total": {"fontWeight": 700, "fontSize": 20, "lineHeight": 28, "color": "{{text-primary}}"},
                "sub": {"fontSize": 11, "lineHeight": 18, "color": "{{text-secondary}}"},
            },
        }
    return {
        "tooltip": {"trigger": "item"},
        "legend": {
            "data": [d["name"] for d in pd_list], "bottom": 0,
            "textStyle": {"color": "{{text-secondary}}", "fontSize": 11},
            "itemWidth": 8, "itemHeight": 8,
        },
        "series": [{
            "type": "pie", "radius": radius, "center": ["50%", "46%"],
            "avoidLabelOverlap": False, "label": lbl, "labelLine": {"show": False},
            "data": pd_list,
        }],
    }


# ── Scatter ───────────────────────────────────────────────────────────

def _scatter(data: list[dict], x_field, y_field):
    x_field, y_field = _detect(data, x_field, y_field)
    if not x_field or not y_field:
        return _empty()
    pts = [
        [float(d.get(x_field, 0)) if d.get(x_field) is not None else 0,
         float(d.get(y_field, 0)) if d.get(y_field) is not None else 0]
        for d in data
    ]
    return {
        "tooltip": {"trigger": "item"},
        "grid": {"left": 56, "right": 24, "top": 24, "bottom": 40},
        "xAxis": {
            "type": "value",
            "axisLabel": {"color": "{{text-secondary}}", "fontSize": 10},
            "splitLine": {"lineStyle": {"color": "{{border}}"}},
        },
        "yAxis": {
            "type": "value",
            "axisLabel": {"color": "{{text-secondary}}", "fontSize": 10},
            "splitLine": {"lineStyle": {"color": "{{border}}"}},
        },
        "series": [{
            "type": "scatter", "data": pts, "symbolSize": 8,
            "itemStyle": {"color": PALETTE[0]},
        }],
    }


# ── Radar ─────────────────────────────────────────────────────────────

def _radar(data: list[dict], x_field, y_field):
    x_field, y_field = _detect(data, x_field, y_field)
    if not x_field or not y_field:
        return _empty()
    inds, vals, mx = [], [], 0
    for d in data:
        v = float(d.get(y_field, 0)) if d.get(y_field) is not None else 0
        inds.append({"name": str(d.get(x_field, ""))})
        vals.append(v)
        if v > mx:
            mx = v
    for ind in inds:
        ind["max"] = mx * 1.2 if mx > 0 else 100
    return {
        "tooltip": {"trigger": "item"},
        "radar": {
            "indicator": inds, "shape": "polygon",
            "splitArea": {"areaStyle": {"color": ["rgba(255,255,255,0.02)", "rgba(255,255,255,0.05)"]}},
            "axisLine": {"lineStyle": {"color": "{{border}}"}},
            "splitLine": {"lineStyle": {"color": "{{border}}"}},
        },
        "series": [{
            "type": "radar",
            "data": [{"value": vals, "name": "Valor"}],
            "areaStyle": {"opacity": 0.25, "color": PALETTE[0]},
            "lineStyle": {"color": PALETTE[0], "width": 2},
            "itemStyle": {"color": PALETTE[0]},
        }],
    }


# ── Funnel ────────────────────────────────────────────────────────────

def _funnel(data: list[dict], x_field, y_field):
    x_field, y_field = _detect(data, x_field, y_field)
    if not x_field or not y_field:
        return _empty()
    fd = [{
        "name": str(d.get(x_field, "")),
        "value": float(d.get(y_field, 0)) if d.get(y_field) is not None else 0,
        "itemStyle": {"color": PALETTE[i % len(PALETTE)]},
    } for i, d in enumerate(data)]
    fd.sort(key=lambda x: x["value"], reverse=True)
    return {
        "tooltip": {"trigger": "item", "formatter": "{b}: {c}"},
        "legend": {
            "data": [d["name"] for d in fd], "bottom": 0,
            "textStyle": {"color": "{{text-secondary}}", "fontSize": 11},
            "itemWidth": 8, "itemHeight": 8,
        },
        "series": [{
            "type": "funnel", "left": "10%", "top": 16, "bottom": 48, "width": "80%",
            "sort": "descending", "gap": 2,
            "label": {"show": True, "position": "inside", "color": "#fff", "fontSize": 11},
            "data": fd,
        }],
    }


# ── Gauge ─────────────────────────────────────────────────────────────

def _gauge(data: list[dict], y_field):
    if not data:
        return _empty()
    keys = list(data[0].keys())
    if not y_field:
        y_field = next((k for k in keys if isinstance(data[0].get(k), (int, float))), keys[-1] if keys else None)
    if not y_field:
        return _empty()
    v = float(data[0].get(y_field, 0)) if data[0].get(y_field) is not None else 0
    pct = 0 <= v <= 100
    return {
        "series": [{
            "type": "gauge", "startAngle": 200, "endAngle": -20,
            "min": 0, "max": 100 if pct else v * 1.5,
            "radius": "85%",
            "progress": {
                "show": True, "width": 18, "roundCap": True,
                "itemStyle": {"color": PALETTE[0]},
            },
            "axisLine": {"lineStyle": {"width": 18, "color": [[1, "{{border}}"]]}},
            "axisTick": {"show": False},
            "splitLine": {"show": False},
            "axisLabel": {"show": False},
            "pointer": {"show": False},
            "title": {"show": False},
            "detail": {
                "valueAnimation": True, "offsetCenter": [0, "10%"],
                "fontSize": 28, "fontWeight": 700, "color": "{{text-primary}}",
                "formatter": "{value}" + ("%" if pct else ""),
            },
            "data": [{"value": round(v, 1)}],
        }],
    }


# ── Heatmap ───────────────────────────────────────────────────────────

def _heatmap(data: list[dict], x_field, y_field, value_field):
    keys = list(data[0].keys()) if data else []
    sk = [k for k in keys if isinstance(data[0].get(k), str)]
    nk = [k for k in keys if isinstance(data[0].get(k), (int, float))]
    if not x_field and len(sk) >= 1:
        x_field = sk[0]
    if not y_field and len(sk) >= 2:
        y_field = sk[1]
    if not value_field and nk:
        value_field = nk[0]
    if not x_field or not y_field or not value_field:
        return _empty()
    xc = sorted(set(str(d.get(x_field, "")) for d in data))
    yc = sorted(set(str(d.get(y_field, "")) for d in data))
    hd, mx = [], 0
    for d in data:
        xi = xc.index(str(d.get(x_field, "")))
        yi = yc.index(str(d.get(y_field, "")))
        v = float(d.get(value_field, 0)) if d.get(value_field) is not None else 0
        hd.append([xi, yi, v])
        if v > mx:
            mx = v
    return {
        "tooltip": {"position": "top"},
        "grid": {"left": 80, "right": 24, "top": 16, "bottom": 40},
        "xAxis": {
            "type": "category", "data": xc,
            "axisLabel": {"color": "{{text-secondary}}", "fontSize": 10},
            "axisTick": {"show": False},
        },
        "yAxis": {
            "type": "category", "data": yc,
            "axisLabel": {"color": "{{text-secondary}}", "fontSize": 10},
        },
        "visualMap": {
            "min": 0, "max": mx or 1, "calculable": True,
            "orient": "horizontal", "left": "center", "bottom": 0,
            "inRange": {"color": ["#1e3a5f", "#2563EB", "#D97706", "#DC2626"]},
            "textStyle": {"color": "{{text-secondary}}"},
        },
        "series": [{
            "type": "heatmap", "data": hd,
            "label": {"show": True, "color": "#fff", "fontSize": 10},
        }],
    }


# ── Treemap ───────────────────────────────────────────────────────────

def _treemap(data: list[dict], x_field, y_field):
    x_field, y_field = _detect(data, x_field, y_field)
    if not x_field or not y_field:
        return _empty()
    td = [{
        "name": str(d.get(x_field, "")),
        "value": float(d.get(y_field, 0)) if d.get(y_field) is not None else 0,
        "itemStyle": {"color": PALETTE[i % len(PALETTE)]},
    } for i, d in enumerate(data)]
    return {
        "tooltip": {"formatter": "{b}: {c}"},
        "series": [{
            "type": "treemap", "roam": False, "width": "100%", "height": "85%",
            "breadcrumb": {"show": False},
            "label": {"show": True, "color": "#fff", "fontSize": 11, "fontWeight": 500},
            "data": td,
        }],
    }


# ── Waterfall ─────────────────────────────────────────────────────────

def _waterfall(data: list[dict], x_field, y_field):
    x_field, y_field = _detect(data, x_field, y_field)
    if not x_field or not y_field:
        return _empty()
    cats = [str(d.get(x_field, "")) for d in data]
    vals = [float(d.get(y_field, 0)) if d.get(y_field) is not None else 0 for d in data]
    base, pos, neg = [], [], []
    cum = 0
    for v in vals:
        if v >= 0:
            base.append(cum)
            pos.append(v)
            neg.append(0)
        else:
            base.append(cum + v)
            pos.append(0)
            neg.append(abs(v))
        cum += v
    ts = {"color": "transparent", "borderColor": "transparent"}
    return {
        "tooltip": {"trigger": "axis"},
        "grid": {"left": 56, "right": 16, "top": 16, "bottom": 40},
        "xAxis": {
            "type": "category", "data": cats,
            "axisLabel": {"color": "{{text-secondary}}", "fontSize": 10},
            "axisTick": {"show": False},
        },
        "yAxis": {
            "type": "value",
            "splitLine": {"lineStyle": {"color": "{{border}}"}},
            "axisLabel": {"color": "{{text-secondary}}", "fontSize": 10},
        },
        "series": [
            {"type": "bar", "stack": "wf", "data": base, "itemStyle": ts, "emphasis": {"itemStyle": ts}},
            {"type": "bar", "stack": "wf", "data": pos, "name": "Aumento",
             "itemStyle": {"color": PALETTE[2], "borderRadius": [3, 3, 0, 0]}},
            {"type": "bar", "stack": "wf", "data": neg, "name": "Reducao",
             "itemStyle": {"color": "#e11d48", "borderRadius": [3, 3, 0, 0]}},
        ],
    }
