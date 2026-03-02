interface Props {
  label: string;
  value: string;
  change?: string;
  sparkline?: number[];
  measure?: string;
}

/* ── SVG icon paths by metric keyword ─────────────────────── */
const ICONS: Record<string, string> = {
  casos_novos:    'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
  baixados:       'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  baixa:          'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  pendentes:      'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  pendente:       'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  sentencas:      'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  sentenca:       'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  processos:      'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  processo:       'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  valor:          'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  tempo:          'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  media:          'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  taxa:           'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  liquidos:       'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  congestionamento: 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6',
  antiguidade:    'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
};

const FALLBACK_ICON = 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z';

function getIcon(label: string, measure?: string): string {
  const search = (measure || label).toLowerCase();
  for (const [key, path] of Object.entries(ICONS)) {
    if (search.includes(key)) return path;
  }
  return FALLBACK_ICON;
}

/* ── Sparkline SVG ────────────────────────────────────────── */
function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 64;
  const h = 24;
  const pad = 2;

  const points = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(' ');

  const color = positive ? 'var(--success)' : 'var(--danger)';

  return (
    <svg width={w} height={h} className="kpi-sparkline" viewBox={`0 0 ${w} ${h}`}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ── Main component ───────────────────────────────────────── */
export default function KPICard({ label, value, change, sparkline, measure }: Props) {
  const isNeg = change?.startsWith('-');
  const isPositive = change ? !isNeg : true;
  const iconPath = getIcon(label, measure);

  // Determine trend color class
  const trendClass = !change ? 'neutral' : isNeg ? 'negative' : 'up';

  return (
    <div className={`dash-card kpi kpi-trend-${trendClass}`}>
      <div className="kpi-top">
        <div className={`kpi-icon kpi-icon-${trendClass}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d={iconPath} />
          </svg>
        </div>
        <div className="kpi-label">{label}</div>
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-bottom">
        {change && (
          <div className={`kpi-change ${trendClass}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {isNeg
                ? <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                : <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              }
            </svg>
            <span>{change}</span>
          </div>
        )}
        {sparkline && sparkline.length > 1 && (
          <Sparkline data={sparkline} positive={isPositive} />
        )}
      </div>
    </div>
  );
}
