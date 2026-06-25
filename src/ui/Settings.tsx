import { useStore } from '../store/useStore';
import { locateMe } from '../util/locate';
import { BASEMAP_OPTIONS } from '../map/basemaps';
import { LocateIcon } from './icons';

const UNIT_OPTIONS = [
  { id: 'imperial', label: 'Imperial', hint: 'ft · kt' },
  { id: 'metric', label: 'Metric', hint: 'm · km/h' },
] as const;

export default function Settings() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const home = settings.home;
  return (
    <div className="pane scroll-area">
      <div className="section-label">Assistant</div>
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
