import { useEffect, useState } from 'react';
import { listRules, saveRule, deleteRule } from '../alerts/alertStore';
import type { AlertRule } from '../types';
import { newId } from '../util/id';
import { PlusIcon, CloseIcon } from './icons';

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
    <div className="pane scroll-area">
      <div className="card stack">
        <input className="field" placeholder="Alert name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="field" placeholder="Type (e.g. B744)" value={type} onChange={(e) => setType(e.target.value)} />
        <div className="inline-toggle">
          <span>Emergency squawks</span>
          <label className="switch">
            <input type="checkbox" checked={emergency} onChange={(e) => setEmergency(e.target.checked)} />
            <span className="switch__track" />
          </label>
        </div>
        <button className="btn btn--accent btn--block" onClick={add}><PlusIcon size={16} /> Add alert</button>
      </div>
      {rules.map((r) => (
        <div key={r.id} className="list-row">
          <div>
            <div className="row__title">{r.name}</div>
            <div className="muted">{JSON.stringify(r.criteria)}</div>
          </div>
          <button className="btn btn--ghost btn--danger" aria-label="Delete" onClick={() => deleteRule(r.id).then(refresh)}><CloseIcon /></button>
        </div>
      ))}
    </div>
  );
}
