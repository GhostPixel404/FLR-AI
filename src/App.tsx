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
import MapControls from './ui/MapControls';
import Toasts from './ui/Toasts';
import { useStore } from './store/useStore';
import { AirplanesLiveProvider } from './data/airplanesLive';
import { startPolling } from './poll/pollLoop';
import { recordSightings } from './stats/statsStore';
import { evaluateAlerts } from './alerts/alertStore';
import { recordPositions } from './poll/trails';
import { locateMe } from './util/locate';
import { PlaneIcon, ChatIcon, BellIcon, ChartIcon, GearIcon, SunIcon, MoonIcon } from './ui/icons';
import { applyTheme, effectiveTheme } from './util/theme';

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
  const theme = useStore((s) => s.settings.theme);
  const updateSettings = useStore((s) => s.updateSettings);
  const resolvedTheme = effectiveTheme(theme);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useStore.getState().select(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Center on the user's current location at startup (silent — falls back to the
  // default view if permission is denied/unavailable).
  useEffect(() => { locateMe({ silent: true }); }, []);

  // Apply the theme; while on "system", track OS changes live.
  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

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

      <MapControls />

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
          <button
            className="theme-toggle"
            aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={() => updateSettings({ theme: resolvedTheme === 'dark' ? 'light' : 'dark' })}
          >
            {resolvedTheme === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
          </button>
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
