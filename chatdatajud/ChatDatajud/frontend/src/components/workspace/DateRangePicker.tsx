import { useState } from 'react';

interface Props {
  onRangeChange: (from: string, to: string) => void;
  disabled?: boolean;
}

export default function DateRangePicker({ onRangeChange, disabled }: Props) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setFrom(v);
    if (v && to) onRangeChange(`${v}-01`, lastDayOfMonth(to));
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setTo(v);
    if (from && v) onRangeChange(`${from}-01`, lastDayOfMonth(v));
  };

  const handleClear = () => {
    setFrom('');
    setTo('');
    onRangeChange('', '');
  };

  return (
    <div className="date-range-picker">
      <svg className="date-range-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      <input
        type="month"
        className="date-range-input"
        value={from}
        onChange={handleFromChange}
        disabled={disabled}
        placeholder="De"
        title="Data inicial"
      />
      <span className="date-range-sep">—</span>
      <input
        type="month"
        className="date-range-input"
        value={to}
        onChange={handleToChange}
        disabled={disabled}
        placeholder="Até"
        title="Data final"
      />
      {(from || to) && (
        <button className="date-range-clear" onClick={handleClear} disabled={disabled} title="Limpar período">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

function lastDayOfMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m, 0);
  return `${y}-${String(m).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
