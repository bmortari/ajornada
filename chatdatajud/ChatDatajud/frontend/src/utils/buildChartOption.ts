/**
 * Converts simple chart config (chart_type, data, x_field, y_field)
 * into a full ECharts option object with theme placeholders.
 *
 * Supports 16 chart types — mirrors backend chart_builder.py.
 */

interface SimpleChart {
  chart_type: string;
  title?: string;
  data: any[];
  x_field?: string;
  y_field?: string;
  series_field?: string;
}

const PALETTE = [
  '#2563EB', '#0891B2', '#059669', '#7C3AED', '#D97706',
  '#0D9488', '#DC2626', '#64748B', '#A855F7', '#EA580C',
];

const EMPTY = (text = 'Sem dados') => ({
  graphic: { type: 'text', left: 'center', top: 'center', style: { text, fontSize: 14, fill: '{{text-secondary}}' } },
});

/* ── Auto-detect fields ──────────────────────────────────────────── */
function detect(data: any[], x?: string, y?: string): [string | undefined, string | undefined] {
  const keys = Object.keys(data[0] || {});
  if (!x) x = keys.find((k) => typeof data[0][k] === 'string') || keys[0];
  if (!y) y = keys.find((k) => typeof data[0][k] === 'number') || keys[1];
  if (data.length > 0) {
    const dk = Object.keys(data[0]);
    if (x && !dk.includes(x)) x = dk.find((k) => typeof data[0][k] === 'string') || dk[0];
    if (y && !dk.includes(y)) y = dk.find((k) => typeof data[0][k] === 'number') || dk[dk.length - 1];
  }
  return [x, y];
}

/* ── Main entry ─────────────────────────────────────────────────── */
export function buildChartOption(cfg: SimpleChart): Record<string, unknown> {
  const { chart_type, data, x_field, y_field, series_field } = cfg;
  if (!data || data.length === 0) return EMPTY();

  switch (chart_type) {
    case 'pie':            return buildPie(data, x_field, y_field);
    case 'donut':          return buildPie(data, x_field, y_field, true);
    case 'horizontal_bar': return buildCartesian('bar', data, x_field, y_field, series_field, true);
    case 'stacked_bar':    return buildCartesian('bar', data, x_field, y_field, series_field, false, true);
    case 'grouped_bar':    return buildCartesian('bar', data, x_field, y_field, series_field);
    case 'area':           return buildCartesian('line', data, x_field, y_field, series_field, false, false, true);
    case 'stacked_area':   return buildCartesian('line', data, x_field, y_field, series_field, false, true, true);
    case 'line':           return buildCartesian('line', data, x_field, y_field, series_field);
    case 'scatter':        return buildScatter(data, x_field, y_field);
    case 'radar':          return buildRadar(data, x_field, y_field);
    case 'funnel':         return buildFunnel(data, x_field, y_field);
    case 'gauge':          return buildGauge(data, y_field);
    case 'heatmap':        return buildHeatmap(data, x_field, y_field, series_field);
    case 'treemap':        return buildTreemap(data, x_field, y_field);
    case 'waterfall':      return buildWaterfall(data, x_field, y_field);
    case 'table':
    case 'kpi_grid':       return {};
    default:               return buildCartesian('bar', data, x_field, y_field, series_field);
  }
}

/* ── Cartesian (bar / line / area) ──────────────────────────────── */
function buildCartesian(
  type: 'bar' | 'line', data: any[],
  xField?: string, yField?: string, seriesField?: string,
  horizontal = false, stack = false, area = false,
): Record<string, unknown> {
  [xField, yField] = detect(data, xField, yField);
  if (!xField || !yField) return EMPTY();

  if (seriesField || stack) {
    return buildMultiSeries(type, data, xField, yField, seriesField || xField, horizontal, stack, area);
  }

  const cats = data.map((d) => String(d[xField!] ?? ''));
  const vals = data.map((d) => Number(d[yField!]) || 0);

  const s: any = { type, data: vals, itemStyle: { color: PALETTE[0] } };
  if (type === 'bar') s.itemStyle.borderRadius = horizontal ? [0, 0, 3, 3] : [3, 3, 0, 0];
  if (type === 'line') { s.smooth = true; s.lineStyle = { width: 2 }; s.symbol = 'circle'; s.symbolSize = 5; }
  if (area) {
    s.areaStyle = {
      color: {
        type: 'linear', x: 0, y: 0, x2: horizontal ? 1 : 0, y2: horizontal ? 0 : 1,
        colorStops: [{ offset: 0, color: 'rgba(37,99,235,0.25)' }, { offset: 1, color: 'rgba(37,99,235,0)' }],
      },
    };
  }

  const ca: any = {
    type: 'category', data: cats,
    axisLabel: { color: '{{text-secondary}}', fontSize: 10 },
    axisLine: { lineStyle: { color: '{{border}}' } },
    axisTick: { show: false },
  };
  const va: any = {
    type: 'value',
    splitLine: { lineStyle: { color: '{{border}}' } },
    axisLabel: { color: '{{text-secondary}}', fontSize: 10 },
  };

  if (horizontal) {
    ca.axisLabel.width = 90; ca.axisLabel.overflow = 'truncate';
    return { tooltip: { trigger: 'axis' }, grid: { left: 110, right: 24, top: 16, bottom: 24 }, xAxis: va, yAxis: { ...ca, inverse: true }, series: [s] };
  }
  return { tooltip: { trigger: 'axis' }, grid: { left: 56, right: 16, top: 16, bottom: 40 }, xAxis: ca, yAxis: va, series: [s] };
}

/* ── Multi-series ────────────────────────────────────────────────── */
function buildMultiSeries(
  type: 'bar' | 'line', data: any[],
  xField: string, yField: string, seriesField: string,
  horizontal = false, stack = false, area = false,
): Record<string, unknown> {
  const catsSet = [...new Set(data.map((d) => String(d[xField] ?? '')))].sort();
  const names = [...new Set(data.map((d) => String(d[seriesField] ?? '')))].sort();
  const seriesArr = names.map((name, idx) => {
    const vals = catsSet.map((cat) => {
      const row = data.find((d) => String(d[xField]) === cat && String(d[seriesField]) === name);
      return row ? Number(row[yField]) || 0 : 0;
    });
    const s: any = { name, type, data: vals, itemStyle: { color: PALETTE[idx % PALETTE.length] } };
    if (type === 'bar') s.itemStyle.borderRadius = horizontal ? [0, 0, 3, 3] : [3, 3, 0, 0];
    if (type === 'line') { s.smooth = true; s.symbol = 'circle'; s.symbolSize = 5; }
    if (stack) s.stack = 'total';
    if (area) s.areaStyle = { opacity: 0.35 };
    return s;
  });

  const ca: any = { type: 'category', data: catsSet, axisLabel: { color: '{{text-secondary}}', fontSize: 10 }, axisLine: { lineStyle: { color: '{{border}}' } }, axisTick: { show: false } };
  const va: any = { type: 'value', splitLine: { lineStyle: { color: '{{border}}' } }, axisLabel: { color: '{{text-secondary}}', fontSize: 10 } };
  const r: any = {
    tooltip: { trigger: 'axis' },
    legend: { data: names, bottom: 0, textStyle: { color: '{{text-secondary}}', fontSize: 11 }, itemWidth: 8, itemHeight: 8 },
    grid: { left: 56, right: 16, top: 16, bottom: 48 },
    series: seriesArr,
  };
  if (horizontal) { ca.axisLabel.width = 90; ca.axisLabel.overflow = 'truncate'; r.grid.left = 110; r.grid.bottom = 24; r.xAxis = va; r.yAxis = { ...ca, inverse: true }; }
  else { r.xAxis = ca; r.yAxis = va; }
  return r;
}

/* ── Pie / Donut ─────────────────────────────────────────────────── */
function buildPie(data: any[], xField?: string, yField?: string, donut = false): Record<string, unknown> {
  [xField, yField] = detect(data, xField, yField);
  if (!xField || !yField) return EMPTY();

  let total = 0;
  const pieData = data.map((d, i) => {
    const v = Number(d[yField!]) || 0;
    total += v;
    return { name: String(d[xField!] ?? ''), value: v, itemStyle: { color: PALETTE[i % PALETTE.length] } };
  });

  const radius: [string, string] = donut ? ['48%', '72%'] : ['0%', '70%'];
  let label: any = { show: false };
  if (donut) {
    const ts = total >= 1000 ? total.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : String(Math.round(total));
    label = {
      show: true, position: 'center',
      formatter: `{total|${ts}}\n{sub|Total}`,
      rich: {
        total: { fontWeight: 700, fontSize: 20, lineHeight: 28, color: '{{text-primary}}' },
        sub: { fontSize: 11, lineHeight: 18, color: '{{text-secondary}}' },
      },
    };
  }
  return {
    tooltip: { trigger: 'item' },
    legend: { data: pieData.map((d) => d.name), bottom: 0, textStyle: { color: '{{text-secondary}}', fontSize: 11 }, itemWidth: 8, itemHeight: 8 },
    series: [{ type: 'pie', radius, center: ['50%', '46%'], avoidLabelOverlap: false, label, labelLine: { show: false }, data: pieData }],
  };
}

/* ── Scatter ─────────────────────────────────────────────────────── */
function buildScatter(data: any[], xField?: string, yField?: string): Record<string, unknown> {
  [xField, yField] = detect(data, xField, yField);
  if (!xField || !yField) return EMPTY();
  const pts = data.map((d) => [Number(d[xField!]) || 0, Number(d[yField!]) || 0]);
  return {
    tooltip: { trigger: 'item' },
    grid: { left: 56, right: 24, top: 24, bottom: 40 },
    xAxis: { type: 'value', axisLabel: { color: '{{text-secondary}}', fontSize: 10 }, splitLine: { lineStyle: { color: '{{border}}' } } },
    yAxis: { type: 'value', axisLabel: { color: '{{text-secondary}}', fontSize: 10 }, splitLine: { lineStyle: { color: '{{border}}' } } },
    series: [{ type: 'scatter', data: pts, symbolSize: 8, itemStyle: { color: PALETTE[0] } }],
  };
}

/* ── Radar ────────────────────────────────────────────────────────── */
function buildRadar(data: any[], xField?: string, yField?: string): Record<string, unknown> {
  [xField, yField] = detect(data, xField, yField);
  if (!xField || !yField) return EMPTY();
  let mx = 0;
  const inds: any[] = [];
  const vals: number[] = [];
  data.forEach((d) => {
    const v = Number(d[yField!]) || 0;
    inds.push({ name: String(d[xField!] ?? '') });
    vals.push(v);
    if (v > mx) mx = v;
  });
  inds.forEach((ind) => { ind.max = mx > 0 ? mx * 1.2 : 100; });
  return {
    tooltip: { trigger: 'item' },
    radar: {
      indicator: inds, shape: 'polygon',
      splitArea: { areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.05)'] } },
      axisLine: { lineStyle: { color: '{{border}}' } },
      splitLine: { lineStyle: { color: '{{border}}' } },
    },
    series: [{
      type: 'radar', data: [{ value: vals, name: 'Valor' }],
      areaStyle: { opacity: 0.25, color: PALETTE[0] },
      lineStyle: { color: PALETTE[0], width: 2 },
      itemStyle: { color: PALETTE[0] },
    }],
  };
}

/* ── Funnel ───────────────────────────────────────────────────────── */
function buildFunnel(data: any[], xField?: string, yField?: string): Record<string, unknown> {
  [xField, yField] = detect(data, xField, yField);
  if (!xField || !yField) return EMPTY();
  const fd = data.map((d, i) => ({
    name: String(d[xField!] ?? ''), value: Number(d[yField!]) || 0,
    itemStyle: { color: PALETTE[i % PALETTE.length] },
  })).sort((a, b) => b.value - a.value);
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c}' },
    legend: { data: fd.map((d) => d.name), bottom: 0, textStyle: { color: '{{text-secondary}}', fontSize: 11 }, itemWidth: 8, itemHeight: 8 },
    series: [{
      type: 'funnel', left: '10%', top: 16, bottom: 48, width: '80%',
      sort: 'descending', gap: 2,
      label: { show: true, position: 'inside', color: '#fff', fontSize: 11 },
      data: fd,
    }],
  };
}

/* ── Gauge ────────────────────────────────────────────────────────── */
function buildGauge(data: any[], yField?: string): Record<string, unknown> {
  if (!data.length) return EMPTY();
  const keys = Object.keys(data[0]);
  if (!yField) yField = keys.find((k) => typeof data[0][k] === 'number') || keys[keys.length - 1];
  if (!yField) return EMPTY();
  const v = Number(data[0][yField]) || 0;
  const pct = v >= 0 && v <= 100;
  return {
    series: [{
      type: 'gauge', startAngle: 200, endAngle: -20,
      min: 0, max: pct ? 100 : v * 1.5, radius: '85%',
      progress: { show: true, width: 18, roundCap: true, itemStyle: { color: PALETTE[0] } },
      axisLine: { lineStyle: { width: 18, color: [[1, '{{border}}']] } },
      axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
      pointer: { show: false }, title: { show: false },
      detail: { valueAnimation: true, offsetCenter: [0, '10%'], fontSize: 28, fontWeight: 700, color: '{{text-primary}}', formatter: `{value}${pct ? '%' : ''}` },
      data: [{ value: Math.round(v * 10) / 10 }],
    }],
  };
}

/* ── Heatmap ─────────────────────────────────────────────────────── */
function buildHeatmap(data: any[], xField?: string, yField?: string, valueField?: string): Record<string, unknown> {
  const keys = Object.keys(data[0] || {});
  const sk = keys.filter((k) => typeof data[0][k] === 'string');
  const nk = keys.filter((k) => typeof data[0][k] === 'number');
  if (!xField && sk.length >= 1) xField = sk[0];
  if (!yField && sk.length >= 2) yField = sk[1];
  if (!valueField && nk.length) valueField = nk[0];
  if (!xField || !yField || !valueField) return EMPTY();

  const xc = [...new Set(data.map((d) => String(d[xField!] ?? '')))].sort();
  const yc = [...new Set(data.map((d) => String(d[yField!] ?? '')))].sort();
  let mx = 0;
  const hd = data.map((d) => {
    const xi = xc.indexOf(String(d[xField!] ?? ''));
    const yi = yc.indexOf(String(d[yField!] ?? ''));
    const v = Number(d[valueField!]) || 0;
    if (v > mx) mx = v;
    return [xi, yi, v];
  });
  return {
    tooltip: { position: 'top' },
    grid: { left: 80, right: 24, top: 16, bottom: 40 },
    xAxis: { type: 'category', data: xc, axisLabel: { color: '{{text-secondary}}', fontSize: 10 }, axisTick: { show: false } },
    yAxis: { type: 'category', data: yc, axisLabel: { color: '{{text-secondary}}', fontSize: 10 } },
    visualMap: { min: 0, max: mx || 1, calculable: true, orient: 'horizontal', left: 'center', bottom: 0, inRange: { color: ['#1a3a2a', '#10b981', '#f59e0b', '#e11d48'] }, textStyle: { color: '{{text-secondary}}' } },
    series: [{ type: 'heatmap', data: hd, label: { show: true, color: '#fff', fontSize: 10 } }],
  };
}

/* ── Treemap ─────────────────────────────────────────────────────── */
function buildTreemap(data: any[], xField?: string, yField?: string): Record<string, unknown> {
  [xField, yField] = detect(data, xField, yField);
  if (!xField || !yField) return EMPTY();
  const td = data.map((d, i) => ({
    name: String(d[xField!] ?? ''), value: Number(d[yField!]) || 0,
    itemStyle: { color: PALETTE[i % PALETTE.length] },
  }));
  return {
    tooltip: { formatter: '{b}: {c}' },
    series: [{
      type: 'treemap', roam: false, width: '100%', height: '85%',
      breadcrumb: { show: false },
      label: { show: true, color: '#fff', fontSize: 11, fontWeight: 500 },
      data: td,
    }],
  };
}

/* ── Waterfall ───────────────────────────────────────────────────── */
function buildWaterfall(data: any[], xField?: string, yField?: string): Record<string, unknown> {
  [xField, yField] = detect(data, xField, yField);
  if (!xField || !yField) return EMPTY();
  const cats = data.map((d) => String(d[xField!] ?? ''));
  const vals = data.map((d) => Number(d[yField!]) || 0);
  const base: number[] = []; const pos: number[] = []; const neg: number[] = [];
  let cum = 0;
  vals.forEach((v) => {
    if (v >= 0) { base.push(cum); pos.push(v); neg.push(0); }
    else { base.push(cum + v); pos.push(0); neg.push(Math.abs(v)); }
    cum += v;
  });
  const ts = { color: 'transparent', borderColor: 'transparent' };
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 56, right: 16, top: 16, bottom: 40 },
    xAxis: { type: 'category', data: cats, axisLabel: { color: '{{text-secondary}}', fontSize: 10 }, axisTick: { show: false } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '{{border}}' } }, axisLabel: { color: '{{text-secondary}}', fontSize: 10 } },
    series: [
      { type: 'bar', stack: 'wf', data: base, itemStyle: ts, emphasis: { itemStyle: ts } },
      { type: 'bar', stack: 'wf', data: pos, name: 'Aumento', itemStyle: { color: '#10b981', borderRadius: [3, 3, 0, 0] } },
      { type: 'bar', stack: 'wf', data: neg, name: 'Redução', itemStyle: { color: '#e11d48', borderRadius: [3, 3, 0, 0] } },
    ],
  };
}
