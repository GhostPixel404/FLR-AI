import { useEffect, useState } from 'react';
import { listRules, saveRule, deleteRule } from '../alerts/alertStore';
import type { AlertRule } from '../types';
import { newId } from '../util/id';

export default function AlertsManager() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [emergency, setEmergency] = useState(false);
  const refresh = () => listRules().then(setRules);
  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    window.addEventListener('flr-alerts-changed', refresh);
    return () => window.removeEventListener('flr-alerts-changed', refresh);
  }, []);
  const add = async () => {
    if (!name) return;
    await saveRule({ id: newId(), name, enabled: true,
      criteria: { ...(type ? { type } : {}), ...(emergency ? { emergency: true } : {}) } });
    setName(''); setType(''); setEmergency(false); refresh();
  };
  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
        <input placeholder="Alert name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Type (e.g. B744)" value={type} onChange={(e) => setType(e.target.value)} />
        <label><input type="checkbox" checked={emergency}
          onChange={(e) => setEmergency(e.target.checked)} /> Emergency squawks</label>
        <button onClick={add}>Add alert</button>
      </div>
      {rules.map((r) => (
        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
          <span>{r.name} <small style={{ color: '#6b7280' }}>{JSON.stringify(r.criteria)}</small></span>
          <button onClick={() => deleteRule(r.id).then(refresh)}>✕</button>
        </div>
      ))}
    </div>
  );
}
