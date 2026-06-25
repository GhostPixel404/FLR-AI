import { useMemo, useRef, useState } from 'react';
import { useStore, visibleAircraft } from '../store/useStore';
import { Assistant, type ChatTurn } from '../ai/assistant';
import type { ToolActions } from '../ai/tools';
import { getRoute, getAircraftInfo } from '../enrich/adsbdb';
import { saveRule, listRules, deleteRule } from '../alerts/alertStore';
import { getSummary } from '../stats/statsStore';
import type { AlertCriteria } from '../types';
import { newId } from '../util/id';
import { ArrowUpIcon } from './icons';

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
    <div className="chat">
      <div className="chat__scroll scroll-area">
        {turns.length === 0 && (
          <div className="chat__empty">
            <strong>Ask the assistant</strong>
            Try "show me military aircraft" or "what's the rarest plane I've seen?"
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className={`bubble ${t.role === 'user' ? 'bubble--user' : 'bubble--ai'}`}>{t.text}</div>
        ))}
        {busy && <div className="bubble bubble--ai bubble--typing">Thinking…</div>}
        <div ref={endRef} />
      </div>
      <div className="chat__bar">
        <input className="field" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Ask about the skies…" />
        <button className="btn btn--accent chat__send" onClick={send} disabled={busy} aria-label="Send"><ArrowUpIcon /></button>
      </div>
    </div>
  );
}
