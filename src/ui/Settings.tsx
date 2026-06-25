import { useState } from 'react';
import { useStore } from '../store/useStore';
import { locateMe } from '../util/locate';
import { BASEMAP_OPTIONS } from '../map/basemaps';
import { testConnection, type TestResult } from '../ai/createAssistant';
import { LocateIcon } from './icons';

const UNIT_OPTIONS = [
  { id: 'imperial', label: 'Imperial', hint: 'ft · kt' },
  { id: 'metric', label: 'Metric', hint: 'm · km/h' },
] as const;

const THEME_OPTIONS = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
] as const;

export default function Settings() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const home = settings.home;
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<TestResult | null>(null);

  const runTest = async () => {
    setTesting(true);
    setTest(null);
    setTest(await testConnection(settings));
    setTesting(false);
  };
  return (
    <div className="pane scroll-area">
      <div className="section-label">AI provider</div>
      <div className="seg-toggle" role="radiogroup" aria-label="AI provider">
        <button role="radio" aria-checked={settings.aiProvider === 'gemini'}
          className={`seg-toggle__item ${settings.aiProvider === 'gemini' ? 'is-active' : ''}`}
          onClick={() => update({ aiProvider: 'gemini' })}>Gemini</button>
        <button role="radio" aria-checked={settings.aiProvider === 'openai'}
          className={`seg-toggle__item ${settings.aiProvider === 'openai' ? 'is-active' : ''}`}
          onClick={() => update({ aiProvider: 'openai' })}>OpenAI-compatible</button>
      </div>

      {settings.aiProvider === 'gemini' ? (
        <>
          <div className="form-row">
            <label>Gemini API key</label>
            <input className="field" type="password" placeholder="Paste your Google AI key"
              value={settings.geminiApiKey} onChange={(e) => update({ geminiApiKey: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Model</label>
            <input className="field" value={settings.geminiModel}
              onChange={(e) => update({ geminiModel: e.target.value })} />
          </div>
          <div className="muted">Free tier at aistudio.google.com. If you hit a limit, try
            <code> gemini-2.0-flash</code> or <code> gemini-2.5-flash-lite</code>.</div>
        </>
      ) : (
        <>
          <div className="chips" style={{ padding: '0 0 12px' }}>
            <button className="chip" onClick={() => update({ openaiBaseUrl: 'https://openrouter.ai/api/v1' })}>OpenRouter (free cloud)</button>
            <button className="chip" onClick={() => update({ openaiBaseUrl: 'http://localhost:11434/v1', openaiModel: settings.openaiModel || 'llama3.1' })}>Ollama (local)</button>
          </div>
          <div className="form-row">
            <label>Base URL</label>
            <input className="field" value={settings.openaiBaseUrl}
              onChange={(e) => update({ openaiBaseUrl: e.target.value })} />
          </div>
          <div className="form-row">
            <label>API key</label>
            <input className="field" type="password" placeholder="(leave blank for local Ollama)"
              value={settings.openaiApiKey} onChange={(e) => update({ openaiApiKey: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Model</label>
            <input className="field" placeholder="e.g. google/gemini-2.0-flash-exp:free"
              value={settings.openaiModel} onChange={(e) => update({ openaiModel: e.target.value })} />
          </div>
          <div className="muted">The model <strong>must support tools</strong> (function calling) or the assistant can't control the map. On OpenRouter, filter models by the <strong>“Tools”</strong> badge — good free picks: <code>google/gemini-2.0-flash-exp:free</code> or <code>meta-llama/llama-3.3-70b-instruct:free</code>. Ollama: <code>OLLAMA_ORIGINS={'*'} ollama serve</code> with a tool model (<code>llama3.1</code>, <code>qwen2.5</code>). Use <strong>Test connection</strong> below to check.</div>
        </>
      )}

      <button className="btn btn--block" style={{ marginTop: 4 }} onClick={runTest} disabled={testing}>
        {testing ? 'Testing…' : 'Test connection'}
      </button>
      {test && (
        <div className={`test-result ${test.ok ? 'test-result--ok' : 'test-result--fail'}`}>
          {test.ok ? '✓ ' : '⚠ '}{test.message}
        </div>
      )}

      <div className="section-label">Appearance</div>
      <div className="seg-toggle" role="radiogroup" aria-label="Theme">
        {THEME_OPTIONS.map((t) => (
          <button
            key={t.id} role="radio" aria-checked={settings.theme === t.id}
            className={`seg-toggle__item ${settings.theme === t.id ? 'is-active' : ''}`}
            onClick={() => update({ theme: t.id })}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="section-label">Units</div>
      <div className="seg-toggle" role="radiogroup" aria-label="Units">
        {UNIT_OPTIONS.map((u) => (
          <button
            key={u.id} role="radio" aria-checked={settings.units === u.id}
            className={`seg-toggle__item ${settings.units === u.id ? 'is-active' : ''}`}
            onClick={() => update({ units: u.id })}
          >
            {u.label}<small>{u.hint}</small>
          </button>
        ))}
      </div>

      <div className="section-label">Map</div>
      <div className="form-row">
        <label>Basemap</label>
        <select className="field" value={settings.basemap}
          onChange={(e) => update({ basemap: e.target.value as any })}>
          {BASEMAP_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>
      <div className="form-row">
        <label>Refresh interval (seconds)</label>
        <input className="field" type="number" min={5} max={30} value={settings.refreshSeconds}
          onChange={(e) => update({ refreshSeconds: Number(e.target.value) })} />
      </div>

      <div className="section-label">Location &amp; alerts</div>
      <button className="btn btn--block" onClick={locateMe}>
        <LocateIcon size={16} /> {home ? 'Update my location' : 'Use my location'}
      </button>
      {home && <div className="muted" style={{ marginTop: 8 }}>
        Home set to {home.lat.toFixed(3)}, {home.lon.toFixed(3)} — used for “within X km” alerts.
      </div>}
      <button className="btn btn--block" style={{ marginTop: 8 }}
        onClick={() => Notification.requestPermission()}>Enable notifications</button>
    </div>
  );
}
