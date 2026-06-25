import { useStore } from '../store/useStore';
import { LocateIcon } from './icons';

export default function Settings() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  return (
    <div className="pane scroll-area">
      <div className="section-label">Assistant</div>
      <div className="form-row">
        <label>Gemini API key</label>
        <input className="field" type="password" value={settings.geminiApiKey}
          onChange={(e) => update({ geminiApiKey: e.target.value })} />
      </div>
      <div className="form-row">
        <label>Model</label>
        <input className="field" value={settings.geminiModel}
          onChange={(e) => update({ geminiModel: e.target.value })} />
      </div>
      <div className="section-label">Map &amp; Units</div>
      <div className="form-row">
        <label>Units</label>
        <select className="field" value={settings.units} onChange={(e) => update({ units: e.target.value as any })}>
          <option value="imperial">Imperial (ft, kt)</option>
          <option value="metric">Metric (m, km/h)</option>
        </select>
      </div>
      <div className="form-row">
        <label>Refresh seconds</label>
        <input className="field" type="number" min={5} max={30} value={settings.refreshSeconds}
          onChange={(e) => update({ refreshSeconds: Number(e.target.value) })} />
      </div>
      <button className="btn" onClick={() => navigator.geolocation.getCurrentPosition((p) =>
        update({ home: { lat: p.coords.latitude, lon: p.coords.longitude } }))}>
        <LocateIcon size={16} /> Set home to current location
      </button>
      <button className="btn" onClick={() => Notification.requestPermission()}>Enable notifications</button>
    </div>
  );
}
