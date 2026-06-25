import { useEffect, useRef, useState } from 'react';
import MapView from './map/MapView';
import FlightList from './ui/FlightList';
import DetailPanel from './ui/DetailPanel';
import FilterBar from './ui/FilterBar';
import SearchBox from './ui/SearchBox';
import ChatPanel from './ui/ChatPanel';
import AlertsManager from './ui/AlertsManager';
import StatsDashboard from './ui/StatsDashboard';
import Settings from './ui/Settings';
import Toasts from './ui/Toasts';
import { useStore } from './store/useStore';
import { AirplanesLiveProvider } from './data/airplanesLive';
import { startPolling } from './poll/pollLoop';
import { recordSightings } from './stats/statsStore';
import { evaluateAlerts } from './alerts/alertStore';
import { recordPositions } from './poll/trails';

type Tab = 'flights' | 'chat' | 'alerts' | 'stats' | 'settings';

export default function App() {
  const [tab, setTab] = useState<Tab>('flights');
  const mapApiRef = useRef<{ flyTo: (lat: number, lon: number, zoom: number) => void }>({ flyTo: () => {} });
  const stale = useStore((s) => s.stale);

  useEffect(() => {
    const provider = new AirplanesLiveProvider();
    const handle = startPolling(
      provider,
      () => useStore.getState().bounds,
      {
        onAircraft: (list) => { useStore.getState().setAircraft(list); useStore.getState().setStale(false); recordPositions(list); },
        onStats: (list, now) => recordSightings(list, now),
        onAlerts: (list) => evaluateAlerts(list, useStore.getState().settings.home),
        home: null,
        onError: () => useStore.getState().setStale(true),
      },
      () => useStore.getState().settings.refreshSeconds * 1000,
    );
    return () => handle.stop();
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
      <div style={{ width: 360, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', gap: 4, padding: 6, borderBottom: '1px solid #e5e7eb' }}>
          {(['flights', 'chat', 'alerts', 'stats', 'settings'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ fontWeight: tab === t ? 700 : 400 }}>{t}</button>
          ))}
        </div>
        {tab === 'flights' && (<>
          <SearchBox /><FilterBar /><FlightList /><DetailPanel />
        </>)}
        {tab === 'chat' && <ChatPanel flyTo={(lat, lon, zoom) => mapApiRef.current.flyTo(lat, lon, zoom)} />}
        {tab === 'alerts' && <AlertsManager />}
        {tab === 'stats' && <StatsDashboard />}
        {tab === 'settings' && <Settings />}
      </div>
      <div style={{ position: 'relative', flex: 1 }}>
        <MapView onReady={(api) => (mapApiRef.current = api)} />
        {stale && <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 20,
          background: '#b91c1c', color: '#fff', padding: '4px 10px', borderRadius: 6 }}>Data stale — retrying…</div>}
        <Toasts />
      </div>
    </div>
  );
}
