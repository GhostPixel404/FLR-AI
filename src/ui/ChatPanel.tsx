import { useMemo, useRef, useState } from 'react';
import { useStore, visibleAircraft } from '../store/useStore';
import { Assistant, type ChatTurn } from '../ai/assistant';
import type { ToolActions } from '../ai/tools';
import { getRoute, getAircraftInfo } from '../enrich/adsbdb';
import { saveRule, listRules, deleteRule } from '../alerts/alertStore';
import { getSummary } from '../stats/statsStore';
import type { AlertCriteria } from '../types';
import { newId } from '../util/id';

export default function ChatPanel({ flyTo }: { flyTo: (lat: number, lon: number, zoom: number) => void }) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const settings = useStore((s) => s.settings);
  const endRef = useRef<HTMLDivElement>(null);

  const actions: ToolActions = useMemo(() => ({
    setMapView: (lat, lon, zoom) => flyTo(lat, lon, zoom),
    setFilter: (patch) => useStore.getState().setFilters(patch as any),
    clearFilters: () => useStore.getState().clearFilters(),
    trackAircraft: (hex) => {
      const exists = useStore.getState().aircraft.has(hex);
      if (exists) { useStore.getState().select(hex); useStore.getState().follow(hex); }
      return exists;
    },
    untrack: () => useStore.getState().follow(null),
    getVisibleAircraft: () => visibleAircraft(useStore.getState()),
    getAircraftDetails: async (idOrReg) => {
      const list = visibleAircraft(useStore.getState());
      const live = list.find((a) => a.hex === idOrReg || a.registration === idOrReg
        || a.callsign === idOrReg) ?? null;
      const route = live?.callsign ? await getRoute(live.callsign) : await getRoute(idOrReg);
      const info = await getAircraftInfo(live?.registration ?? idOrReg);
      return { live, route, info };
    },
    getRoute: (callsign) => getRoute(callsign),
    createAlert: async (name, criteria: AlertCriteria) => {
      const id = newId();
      await saveRule({ id, name, enabled: true, criteria });
      window.dispatchEvent(new Event('flr-alerts-changed'));
      return id;
    },
    listAlerts: async () => (await listRules()).map((r) => ({ id: r.id, name: r.name })),
    deleteAlert: (id) => deleteRule(id),
    queryStats: () => getSummary(),
  }), [flyTo]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || busy) return;
    if (!settings.geminiApiKey) {
      setTurns((t) => [...t, { role: 'model', text: 'Add a Gemini API key in Settings to use the assistant.' }]);
      return;
    }
    setInput('');
    setTurns((t) => [...t, { role: 'user', text: msg }]);
    setBusy(true);
    try {
      const assistant = new Assistant(settings.geminiApiKey, settings.geminiModel, actions);
      const reply = await assistant.send(turns, msg);
      setTurns((t) => [...t, { role: 'model', text: reply }]);
    } catch (err) {
      setTurns((t) => [...t, { role: 'model', text: `Error: ${(err as Error).message}` }]);
    } finally {
      setBusy(false);
      setTimeout(() => endRef.current?.scrollIntoView(), 0);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {turns.map((t, i) => (
          <div key={i} style={{ margin: '6px 0', textAlign: t.role === 'user' ? 'right' : 'left' }}>
            <span style={{ display: 'inline-block', padding: '6px 10px', borderRadius: 8,
              background: t.role === 'user' ? '#1d4ed8' : '#e5e7eb',
              color: t.role === 'user' ? '#fff' : '#111' }}>{t.text}</span>
          </div>
        ))}
        {busy && <div style={{ color: '#6b7280' }}>…thinking</div>}
        <div ref={endRef} />
      </div>
      <div style={{ display: 'flex', gap: 6, padding: 8, borderTop: '1px solid #e5e7eb' }}>
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Ask about the skies…"
          style={{ flex: 1, padding: 8 }} />
        <button onClick={send} disabled={busy}>Send</button>
      </div>
    </div>
  );
}
