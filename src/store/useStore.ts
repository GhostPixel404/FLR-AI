import { create } from 'zustand';
import { DEFAULT_FILTERS, type Aircraft, type Filters, type Settings } from '../types';
import { boundsCenter, haversineKm, type Bounds } from '../util/geo';

// Keep a recently-seen aircraft on the map this long after it drops out of the
// feed, so transient ADS-B coverage gaps don't make planes flicker/disappear.
const RETAIN_MS = 18_000;

const SETTINGS_KEY = 'flr.settings';

const defaultSettings: Settings = {
  aiProvider: 'gemini',
  geminiApiKey: '', geminiModel: 'gemini-2.5-flash',
  openaiBaseUrl: 'https://openrouter.ai/api/v1', openaiApiKey: '', openaiModel: '',
  units: 'imperial',
  refreshSeconds: 6, home: null, basemap: 'auto', theme: 'system',
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch { return defaultSettings; }
}

interface AppState {
  aircraft: Map<string, Aircraft>;
  selectedHex: string | null;
  followedHex: string | null;
  filters: Filters;
  bounds: Bounds | null;
  settings: Settings;
  stale: boolean;
  myLocation: { lat: number; lon: number } | null;
  setAircraft: (list: Aircraft[]) => void;
  select: (hex: string | null) => void;
  follow: (hex: string | null) => void;
  setFilters: (patch: Partial<Filters>) => void;
  clearFilters: () => void;
  setBounds: (b: Bounds) => void;
  setStale: (s: boolean) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setMyLocation: (loc: { lat: number; lon: number } | null) => void;
}

export const useStore = create<AppState>((set, get) => ({
  aircraft: new Map(),
  selectedHex: null,
  followedHex: null,
  filters: DEFAULT_FILTERS,
  bounds: null,
  settings: loadSettings(),
  stale: false,
  myLocation: null,
  setAircraft: (list) => {
    const s = get();
    const now = Date.now();
    // Distance reference: the user's real location if known, else map centre.
    const ref = s.myLocation ?? s.settings.home ?? (s.bounds ? boundsCenter(s.bounds) : null);
    const next = new Map(s.aircraft);
    const incoming = new Set(list.map((a) => a.hex));
    for (const a of list) next.set(a.hex, a);
    // Drop aircraft we haven't seen for a while (transient gaps are retained).
    for (const [hex, a] of next) {
      if (!incoming.has(hex) && now - a.lastUpdate > RETAIN_MS) next.delete(hex);
    }
    // Distance "nearest" everywhere is measured from the user (or map centre).
    if (ref) {
      for (const [hex, a] of next) {
        next.set(hex, { ...a, distanceNm: haversineKm(ref.lat, ref.lon, a.lat, a.lon) / 1.852 });
      }
    }
    set({ aircraft: next });
  },
  select: (hex) => set({ selectedHex: hex }),
  follow: (hex) => set({ followedHex: hex }),
  setFilters: (patch) => set({ filters: { ...get().filters, ...patch } }),
  clearFilters: () => set({ filters: DEFAULT_FILTERS }),
  setBounds: (b) => set({ bounds: b }),
  setStale: (s) => set({ stale: s }),
  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    set({ settings });
  },
  setMyLocation: (loc) => set({ myLocation: loc }),
}));

export function visibleAircraft(state: AppState): Aircraft[] {
  return Array.from(state.aircraft.values());
}
