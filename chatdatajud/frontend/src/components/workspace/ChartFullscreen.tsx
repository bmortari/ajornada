import { useEffect, useCallback } from 'react';
import DynamicChart from './DynamicChart';

interface Props {
  option: Record<string, unknown>;
  title: string;
  onClose: () => void;
}

export default function ChartFullscreen({ option, title, onClose }: Props) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [handleKey]);

  return (
    <div className="chart-fullscreen-overlay" onClick={onClose}>
      <div className="chart-fullscreen-content" onClick={(e) => e.stopPropagation()}>
        <div className="chart-fullscreen-header">
          <h3>{title}</h3>
          <button className="chart-fullscreen-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="chart-fullscreen-body">
          <DynamicChart option={option} height={500} />
        </div>
      </div>
    </div>
  );
}
