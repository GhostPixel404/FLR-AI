import { useEffect, useState } from 'react';
import { getSummary, clearStats } from '../stats/statsStore';
import type { StatsSummary } from '../stats/aggregate';

export default function StatsDashboard() {
  const [sum, setSum] = useState<StatsSummary | null>(null);
  const refresh = () => getSummary().then(setSum);
  useEffect(() => { refresh(); const t = setInterval(refresh, 10000); return () => clearInterval(t); }, []);
  if (!sum) return <div style={{ padding: 12 }}>No data yet.</div>;
  return (
    <div style={{ padding: 12 }}>
      <p><strong>{sum.totalUnique}</strong> unique aircraft seen this session.</p>
      <h4>Most common types</h4>
      <ol>{sum.byType.slice(0, 8).map((t) => <li key={t.type}>{t.type} — {t.count}</li>)}</ol>
      <h4>Rarest (seen once)</h4>
      <ul>{sum.rarest.filter((t) => t.count === 1).slice(0, 8).map((t) => <li key={t.type}>{t.type}</li>)}</ul>
      <button onClick={() => clearStats().then(refresh)}>Reset stats</button>
    </div>
  );
}
