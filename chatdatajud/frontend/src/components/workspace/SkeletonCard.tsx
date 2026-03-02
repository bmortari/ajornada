interface Props {
  type: 'kpi' | 'chart';
  span?: string;
}

export default function SkeletonCard({ type, span = 'col-6' }: Props) {
  if (type === 'kpi') {
    return (
      <div className={`dash-card col-3 skeleton-card`}>
        <div className="skeleton-row" style={{ width: '40%', height: 12 }} />
        <div className="skeleton-row" style={{ width: '60%', height: 28, marginTop: 10 }} />
        <div className="skeleton-row" style={{ width: '30%', height: 10, marginTop: 10 }} />
      </div>
    );
  }
  return (
    <div className={`dash-card ${span} skeleton-card`}>
      <div className="skeleton-row" style={{ width: '50%', height: 12 }} />
      <div className="skeleton-area" style={{ marginTop: 14 }} />
    </div>
  );
}
