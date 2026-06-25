import { useEffect, useState } from 'react';
import { getSummary, clearStats } from '../stats/statsStore';
import type { StatsSummary } from '../stats/aggregate';

export default function StatsDashboard() {
  const [sum, setSum] = useState<StatsSummary | null>(null);
  const refresh = () => getSummary().then(setSum);
  useEffect(() => { refresh(); const t = setInterval(refresh, 10000); return () => clearInterval(t); }, []);
  if (!sum) return <div className="detail__empty">No data yet — aircraft you see will appear here.</div>;
  return (
    <div className="pane scroll-area">
      <div className="card">
        <div className="bignum tabular">{sum.totalUnique}</div>
        <div className="muted">unique aircraft this session</div>
      </div>
      <div className="section-label">Most common types</div>
      <ol>{sum.byType.slice(0, 8).map((t) => <li key={t.type}>{t.type} — {t.count}</li>)}</ol>
      <div className="section-label">Rarest (seen once)</div>
      <ul>{sum.rarest.filter((t) => t.count === 1).slice(0, 8).map((t) => <li key={t.type}>{t.type}</li>)}</ul>
      <button className="btn btn--block" onClick={() => clearStats().then(refresh)}>Reset stats</button>
    </div>
  );
}
