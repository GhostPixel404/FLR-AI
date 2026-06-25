import { create } from 'zustand';
import { DEFAULT_FILTERS, type Aircraft, type Filters, type Settings } from '../types';
import type { Bounds } from '../util/geo';

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
  setAircraft: (list) => set({ aircraft: new Map(list.map((a) => [a.hex, a])) }),
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
