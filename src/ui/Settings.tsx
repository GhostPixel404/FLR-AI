import { useStore } from '../store/useStore';

export default function Settings() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  return (
    <div style={{ padding: 12, display: 'grid', gap: 8 }}>
      <label>Gemini API key
        <input type="password" value={settings.geminiApiKey}
          onChange={(e) => update({ geminiApiKey: e.target.value })} style={{ width: '100%' }} /></label>
      <label>Model
        <input value={settings.geminiModel}
          onChange={(e) => update({ geminiModel: e.target.value })} style={{ width: '100%' }} /></label>
      <label>Units
        <select value={settings.units} onChange={(e) => update({ units: e.target.value as any })}>
          <option value="imperial">Imperial (ft, kt)</option>
          <option value="metric">Metric (m, km/h)</option>
        </select></label>
      <label>Refresh seconds
        <input type="number" min={5} max={30} value={settings.refreshSeconds}
          onChange={(e) => update({ refreshSeconds: Number(e.target.value) })} /></label>
      <button onClick={() => navigator.geolocation.getCurrentPosition((p) =>
        update({ home: { lat: p.coords.latitude, lon: p.coords.longitude } }))}>
        Set home to current location</button>
      <button onClick={() => Notification.requestPermission()}>Enable notifications</button>
    </div>
  );
}
