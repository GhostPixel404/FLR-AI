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
import { PlaneIcon, ChatIcon, BellIcon, ChartIcon, GearIcon } from './ui/icons';

type Tab = 'flights' | 'chat' | 'alerts' | 'stats' | 'settings';

const TABS: { id: Tab; label: string; Icon: typeof PlaneIcon }[] = [
  { id: 'flights', label: 'Flights', Icon: PlaneIcon },
  { id: 'chat', label: 'Assistant', Icon: ChatIcon },
  { id: 'alerts', label: 'Alerts', Icon: BellIcon },
  { id: 'stats', label: 'Stats', Icon: ChartIcon },
  { id: 'settings', label: 'Settings', Icon: GearIcon },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('flights');
  const mapApiRef = useRef<{ flyTo: (lat: number, lon: number, zoom: number) => void }>({ flyTo: () => {} });
  const stale = useStore((s) => s.stale);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useStore.getState().select(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
    <div className="app">
      <div className="map-host">
        <MapView onReady={(api) => (mapApiRef.current = api)} />
      </div>

      {stale && (
        <div className="stale-pill glass glass-thick">
          <span className="stale-pill__dot" />
          Reconnecting…
        </div>
      )}

      <aside className="sidebar glass">
        <div className="sidebar__brand">
          <span className="sidebar__brand-mark"><PlaneIcon size={18} /></span>
          <div>
            <div className="sidebar__title">FLR AI</div>
            <div className="sidebar__subtitle">Live flight radar</div>
          </div>
        </div>

        <div className="segmented" role="tablist" aria-label="Sections">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              aria-label={label}
              className="segmented__item"
              onClick={() => setTab(id)}
            >
              <Icon size={18} />
              <span className="segmented__label">{label}</span>
            </button>
          ))}
        </div>

        <div className="sidebar__body">
          {tab === 'flights' && (<>
            <SearchBox /><FilterBar /><FlightList />
          </>)}
          {tab === 'chat' && (
            <ChatPanel
              flyTo={(lat, lon, zoom) => mapApiRef.current.flyTo(lat, lon, zoom)}
              onOpenSettings={() => setTab('settings')}
            />
          )}
          {tab === 'alerts' && <AlertsManager />}
          {tab === 'stats' && <StatsDashboard />}
          {tab === 'settings' && <Settings />}
        </div>
      </aside>

      {/* Floating selected-aircraft card — visible on every tab */}
      <DetailPanel />

      <Toasts />
    </div>
  );
}
