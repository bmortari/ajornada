import { Component, useEffect, useRef, useMemo } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { BarChart, PieChart, LineChart, ScatterChart, RadarChart, FunnelChart, GaugeChart, HeatmapChart, TreemapChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  RadarComponent,
  GraphicComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { resolveThemeColors } from '../../utils/themeResolver';

echarts.use([BarChart, PieChart, LineChart, ScatterChart, RadarChart, FunnelChart, GaugeChart, HeatmapChart, TreemapChart, GridComponent, TooltipComponent, LegendComponent, VisualMapComponent, RadarComponent, GraphicComponent, CanvasRenderer]);

const EMPTY_OPTION = {
  graphic: { type: 'text', left: 'center', top: 'center', style: { text: 'Erro ao renderizar gráfico', fontSize: 13, fill: '#888' } },
};

/* ── Error Boundary ──────────────────────────────────────────── */
class ChartErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error, info: ErrorInfo) { console.error('[DynamicChart] render error:', err, info); }
  render() {
    if (this.state.hasError) {
      return <div style={{ padding: 24, color: '#888', textAlign: 'center', fontSize: 13 }}>Erro ao renderizar gráfico</div>;
    }
    return this.props.children;
  }
}

/* ── Chart Component ─────────────────────────────────────────── */
interface Props {
  option: Record<string, unknown>;
  height?: number;
}

function ChartInner({ option, height = 220 }: Props) {
  const chartRef = useRef<ReactEChartsCore>(null);

  const safeOption = option && typeof option === 'object' ? option : EMPTY_OPTION;

  /* Resolve theme tokens in options */
  const resolved = useMemo(() => resolveThemeColors(safeOption), [safeOption]);

  /* Re-render on theme change (data-theme mutation) */
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (chartRef.current) {
        const inst = chartRef.current.getEchartsInstance();
        inst.setOption(resolveThemeColors(safeOption), true);
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, [safeOption]);

  return (
    <ReactEChartsCore
      ref={chartRef}
      echarts={echarts}
      option={resolved}
      style={{ height, width: '100%' }}
      opts={{ renderer: 'canvas' }}
      notMerge
    />
  );
}

export default function DynamicChart(props: Props) {
  return (
    <ChartErrorBoundary>
      <ChartInner {...props} />
    </ChartErrorBoundary>
  );
}
