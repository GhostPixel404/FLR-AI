import { useMemo, useRef, useState } from 'react';
import { useStore, visibleAircraft } from '../store/useStore';
import { buildSnapshot } from '../ai/snapshot';
import { getGlobalStats, summarizeGlobal } from '../data/globalStats';
import type { ChatTurn } from '../ai/assistant';
import { createAssistant, isAiConfigured, aiModelLabel } from '../ai/createAssistant';
import type { ToolActions } from '../ai/tools';
import { getRoute, getAircraftInfo } from '../enrich/adsbdb';
import { saveRule, listRules, deleteRule } from '../alerts/alertStore';
import { getSummary } from '../stats/statsStore';
import type { AlertCriteria } from '../types';
import { newId } from '../util/id';
import { ArrowUpIcon } from './icons';

/** Human-friendly labels for the tools the assistant can call. */
const TOOL_LABELS: Record<string, string> = {
  setMapView: 'Moved map', flyTo: 'Moved map', setFilter: 'Filtered',
  clearFilters: 'Cleared filters', queryFlights: 'Scanned flights',
  trackAircraft: 'Tracking', untrack: 'Stopped tracking',
  getAircraftDetails: 'Looked up aircraft', getRoute: 'Looked up route',
  createAlert: 'Created alert', listAlerts: 'Listed alerts',
  deleteAlert: 'Deleted alert', queryStats: 'Read stats',
};

export default function ChatPanel({
  flyTo, onOpenSettings,
}: { flyTo: (lat: number, lon: number, zoom: number) => void; onOpenSettings: () => void }) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
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

  const configured = isAiConfigured(settings);
  const model = aiModelLabel(settings);

  const send = async () => {
    const msg = input.trim();
    if (!msg || busy) return;
    if (!configured) { onOpenSettings(); return; }
    setInput('');
    setTurns((t) => [...t, { role: 'user', text: msg }]);
    setBusy(true);
    try {
      const assistant = createAssistant(settings, actions);
      const onScreen = buildSnapshot(visibleAircraft(useStore.getState()));
      const global = await getGlobalStats();
      const context = global ? `${onScreen}\n\n${summarizeGlobal(global)}` : onScreen;
      const reply = await assistant.send(turns, msg, context);
      setConnected(true);
      setTurns((t) => [...t, { role: 'model', text: reply.text, tools: reply.toolsUsed }]);
    } catch (err) {
      setTurns((t) => [...t, { role: 'model', text: `⚠ ${(err as Error).message}` }]);
    } finally {
      setBusy(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
    }
  };

  const status = !configured
    ? { cls: 'status-chip status-chip--warn', dot: 'warn', text: 'Set up AI', onClick: onOpenSettings }
    : connected
      ? { cls: 'status-chip status-chip--ok', dot: 'ok', text: `Connected · ${model}`, onClick: undefined }
      : { cls: 'status-chip', dot: 'idle', text: model, onClick: undefined };

  return (
    <div className="chat">
      <div className="chat__header">
        <span className="chat__header-title">Assistant</span>
        <button className={status.cls} onClick={status.onClick} disabled={!status.onClick} type="button">
          <span className={`status-dot status-dot--${status.dot}`} />
          {status.text}
        </button>
      </div>

      <div className="chat__scroll scroll-area">
        {turns.length === 0 && (
          <div className="chat__empty">
            <strong>Ask the assistant</strong>
            Try “show me military aircraft”, “track the nearest A380”, or
            “alert me when a 747 is overhead”.
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className={`msg ${t.role === 'user' ? 'msg--user' : 'msg--ai'}`}>
            <div className={`bubble ${t.role === 'user' ? 'bubble--user' : 'bubble--ai'}`}>{t.text}</div>
            {t.tools && t.tools.length > 0 && (
              <div className="tool-chips">
                {[...new Set(t.tools)].map((name) => (
                  <span key={name} className="tool-chip">{TOOL_LABELS[name] ?? name}</span>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="bubble bubble--ai bubble--typing">Thinking…</div>}
        <div ref={endRef} />
      </div>

      <div className="chat__bar">
        <input className="field" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={configured ? 'Ask about the skies…' : 'Set up an AI provider in Settings to chat'} />
        <button className="btn btn--accent chat__send" onClick={send} disabled={busy} aria-label="Send"><ArrowUpIcon /></button>
      </div>
    </div>
  );
}
