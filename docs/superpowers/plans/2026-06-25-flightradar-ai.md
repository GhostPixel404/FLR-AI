# FlightRadar + AI Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, client-only web app that shows live aircraft on a map and includes a Gemini-powered AI assistant that can control the map, identify aircraft, set alerts, and answer stats questions.

**Architecture:** Single Vite + React + TypeScript SPA, no backend. Live data is fetched directly from airplanes.live (browser CORS `*`), enriched on demand from adsbdb.com. State lives in a Zustand store; stats, alerts, and caches persist in IndexedDB. Pure logic (normalization, filtering, alert matching, stats aggregation, AI tool dispatch) is isolated from React/MapLibre so it is unit-testable. The AI assistant uses Gemini function-calling whose tools call the *same* action functions the UI buttons call.

**Tech Stack:** Vite, React 18, TypeScript, MapLibre GL JS, Zustand, `idb`, `@google/generative-ai`, Vitest + @testing-library, OpenFreeMap basemap (no key).

**Deployment:** Free static hosting (GitHub Pages or Vercel), GitHub account **GhostPixel404**. All git operations are deferred to Task 16 (after explicit account confirmation).

---

## File Structure

```
/Users/hrishi/Desktop/MISC/FLR
  index.html
  package.json  tsconfig.json  vite.config.ts  .gitignore  README.md
  src/
    main.tsx  App.tsx  types.ts
    util/      units.ts  units.test.ts  geo.ts  geo.test.ts
    db/        idb.ts
    data/      provider.ts  airplanesLive.ts  airplanesLive.test.ts
    store/     useStore.ts  filters.ts  filters.test.ts
    enrich/    adsbdb.ts  adsbdb.test.ts
    poll/      interpolate.ts  interpolate.test.ts  pollLoop.ts  pollLoop.test.ts
    map/       icons.ts  aircraftLayer.ts  aircraftLayer.test.ts  MapView.tsx
    stats/     aggregate.ts  aggregate.test.ts  statsStore.ts
    alerts/    engine.ts  engine.test.ts  alertStore.ts
    ai/        systemPrompt.ts  tools.ts  tools.test.ts  assistant.ts
    ui/        FlightList.tsx  DetailPanel.tsx  FilterBar.tsx  SearchBox.tsx
               ChatPanel.tsx  AlertsManager.tsx  StatsDashboard.tsx
               Settings.tsx  Toasts.tsx
```

Each file has one responsibility. Pure-logic files (`*.ts` in util/data/store/poll/stats/alerts/ai) carry the unit tests; React/MapLibre files are verified manually since they need a DOM/GPU.

---

## Task 1: Project scaffold + test runner

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/util/units.ts`, `src/util/units.test.ts`

- [ ] **Step 1: Scaffold Vite React-TS app and install deps**

Run (in `/Users/hrishi/Desktop/MISC/FLR`):
```bash
npm create vite@latest . -- --template react-ts
npm install
npm install maplibre-gl zustand idb @google/generative-ai
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```
Expected: `node_modules/` populated, `src/` contains Vite starter files.

- [ ] **Step 2: Configure Vitest in `vite.config.ts`**

Replace `vite.config.ts` with:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
});
```
Create `src/test-setup.ts`:
```ts
import '@testing-library/jest-dom';
```
Add `"test": "vitest"` to the `scripts` block in `package.json`.

- [ ] **Step 3: Write a failing test for a unit conversion**

Create `src/util/units.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { feetToMeters, knotsToKmh, formatAltitude } from './units';

describe('units', () => {
  it('converts feet to meters', () => {
    expect(Math.round(feetToMeters(1000))).toBe(305);
  });
  it('converts knots to km/h', () => {
    expect(Math.round(knotsToKmh(100))).toBe(185);
  });
  it('formats altitude metric vs imperial', () => {
    expect(formatAltitude(10000, 'imperial')).toBe('10,000 ft');
    expect(formatAltitude(10000, 'metric')).toBe('3,048 m');
    expect(formatAltitude(null, 'imperial')).toBe('—');
  });
});
```

- [ ] **Step 4: Run test, verify it fails**

Run: `npm test -- --run src/util/units.test.ts`
Expected: FAIL ("does not provide an export named 'feetToMeters'").

- [ ] **Step 5: Implement `src/util/units.ts`**

```ts
export type UnitSystem = 'metric' | 'imperial';

export const feetToMeters = (ft: number): number => ft * 0.3048;
export const knotsToKmh = (kt: number): number => kt * 1.852;

const withCommas = (n: number): string => n.toLocaleString('en-US');

export function formatAltitude(ft: number | null, units: UnitSystem): string {
  if (ft === null || Number.isNaN(ft)) return '—';
  return units === 'metric'
    ? `${withCommas(Math.round(feetToMeters(ft)))} m`
    : `${withCommas(Math.round(ft))} ft`;
}

export function formatSpeed(kt: number | null, units: UnitSystem): string {
  if (kt === null || Number.isNaN(kt)) return '—';
  return units === 'metric'
    ? `${Math.round(knotsToKmh(kt))} km/h`
    : `${Math.round(kt)} kt`;
}
```

- [ ] **Step 6: Run test, verify it passes**

Run: `npm test -- --run src/util/units.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Replace `src/App.tsx` with a minimal shell**

```tsx
export default function App() {
  return <div id="app-root">FlightRadar AI — booting…</div>;
}
```
Run: `npm run dev` and confirm the page loads at the printed localhost URL. Stop the dev server.

- [ ] **Step 8: (No commit yet — git deferred to Task 16.)**

Note in your working log that Task 1 is complete. Do **not** run `git init`.

---

## Task 2: Core types + geo helpers

**Files:**
- Create: `src/types.ts`, `src/util/geo.ts`, `src/util/geo.test.ts`

- [ ] **Step 1: Define shared types in `src/types.ts`**

```ts
import type { UnitSystem } from './util/units';

export interface Aircraft {
  hex: string;
  callsign: string | null;
  registration: string | null;
  type: string | null;          // ICAO type code, e.g. "B772"
  description: string | null;   // human description from feed
  lat: number;
  lon: number;
  altitude: number | null;      // feet; null when unknown
  onGround: boolean;
  groundSpeed: number | null;   // knots
  track: number | null;         // degrees true
  verticalRate: number | null;  // ft/min
  squawk: string | null;
  emergency: string | null;     // 'none' or an emergency string
  category: string | null;      // ADS-B emitter category, e.g. "A3"
  military: boolean;
  distanceNm: number | null;    // distance from query center (nm)
  seen: number;                 // seconds since last message
  lastUpdate: number;           // epoch ms when received
}

export interface Filters {
  altitudeMin: number | null;
  altitudeMax: number | null;
  type: string | null;          // case-insensitive substring of ICAO type
  airline: string | null;       // case-insensitive callsign prefix
  military: boolean;
  emergency: boolean;
  onGround: boolean | null;     // null = any, true = only ground, false = only airborne
}

export interface AlertCriteria {
  type?: string;
  airlinePrefix?: string;
  military?: boolean;
  emergency?: boolean;
  belowAltitude?: number;       // feet
  withinKm?: number;            // from home location
  registration?: string;
  callsign?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  criteria: AlertCriteria;
  enabled: boolean;
}

export interface Sighting {
  hex: string;
  callsign: string | null;
  type: string | null;
  firstSeen: number;            // epoch ms
  lastSeen: number;             // epoch ms
  count: number;                // number of polls seen in
}

export interface Settings {
  geminiApiKey: string;
  geminiModel: string;
  units: UnitSystem;
  refreshSeconds: number;
  home: { lat: number; lon: number } | null;
}

export const EMERGENCY_SQUAWKS = ['7500', '7600', '7700'] as const;

export const DEFAULT_FILTERS: Filters = {
  altitudeMin: null, altitudeMax: null, type: null, airline: null,
  military: false, emergency: false, onGround: null,
};
```

- [ ] **Step 2: Write failing test `src/util/geo.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { haversineKm, boundsRadiusNm } from './geo';

describe('geo', () => {
  it('computes haversine distance (LHR→CDG ~ 348km)', () => {
    const d = haversineKm(51.47, -0.45, 49.01, 2.55);
    expect(d).toBeGreaterThan(330);
    expect(d).toBeLessThan(360);
  });
  it('derives a query radius (nm) from map bounds, capped at 250', () => {
    const r = boundsRadiusNm({ north: 52, south: 51, east: 0, west: -1 });
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThanOrEqual(250);
  });
});
```

- [ ] **Step 3: Run, verify fail**

Run: `npm test -- --run src/util/geo.test.ts`
Expected: FAIL (module not found / exports missing).

- [ ] **Step 4: Implement `src/util/geo.ts`**

```ts
export interface Bounds { north: number; south: number; east: number; west: number }

const R_KM = 6371;
const toRad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.sqrt(a));
}

export function boundsCenter(b: Bounds): { lat: number; lon: number } {
  return { lat: (b.north + b.south) / 2, lon: (b.east + b.west) / 2 };
}

/** Radius in nautical miles from center to the farthest corner, capped at 250 (feed limit). */
export function boundsRadiusNm(b: Bounds): number {
  const c = boundsCenter(b);
  const km = haversineKm(c.lat, c.lon, b.north, b.east);
  const nm = km / 1.852;
  return Math.min(250, Math.max(1, Math.ceil(nm)));
}
```

- [ ] **Step 5: Run, verify pass**

Run: `npm test -- --run src/util/geo.test.ts`
Expected: PASS (2 tests).

---

## Task 3: Flight data provider (airplanes.live)

**Files:**
- Create: `src/data/provider.ts`, `src/data/airplanesLive.ts`, `src/data/airplanesLive.test.ts`

- [ ] **Step 1: Define the provider interface `src/data/provider.ts`**

```ts
import type { Aircraft } from '../types';
import type { Bounds } from '../util/geo';

export interface FlightProvider {
  /** Fetch aircraft within the given map bounds. Throws on network/HTTP error. */
  poll(bounds: Bounds): Promise<Aircraft[]>;
}
```

- [ ] **Step 2: Write failing test `src/data/airplanesLive.test.ts`**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { normalizeAircraft, AirplanesLiveProvider } from './airplanesLive';

const RAW = {
  ac: [
    { hex: '402f72', r: 'G-BTIM', t: 'P28A', desc: 'PIPER PA-28',
      alt_baro: 'ground', gs: 0, lat: 51.5, lon: -0.76, squawk: '7000',
      seen: 23.3, dst: 11.9 },
    { hex: '39e690', flight: 'AFR38XY ', r: 'F-HZUQ', t: 'BCS3',
      desc: 'AIRBUS A220-300', alt_baro: 4500, gs: 209.7, track: 287.48,
      baro_rate: -992, squawk: '5622', emergency: 'none', category: 'A3',
      lat: 51.4, lon: -0.4, dbFlags: 0, seen: 1.1, dst: 5.0 },
    { hex: 'aef123', flight: 'RCH123 ', t: 'C17', alt_baro: 33000, gs: 450,
      track: 90, lat: 51.2, lon: -0.2, squawk: '7700', dbFlags: 1, seen: 0.5, dst: 8 },
  ],
};

afterEach(() => vi.restoreAllMocks());

describe('normalizeAircraft', () => {
  it('marks ground aircraft and nulls altitude', () => {
    const a = normalizeAircraft(RAW.ac[0], 1000);
    expect(a.onGround).toBe(true);
    expect(a.altitude).toBeNull();
    expect(a.registration).toBe('G-BTIM');
    expect(a.callsign).toBeNull();
  });
  it('trims callsign and keeps numeric altitude', () => {
    const a = normalizeAircraft(RAW.ac[1], 1000);
    expect(a.callsign).toBe('AFR38XY');
    expect(a.altitude).toBe(4500);
    expect(a.verticalRate).toBe(-992);
    expect(a.onGround).toBe(false);
  });
  it('flags military from dbFlags bit 1', () => {
    const a = normalizeAircraft(RAW.ac[2], 1000);
    expect(a.military).toBe(true);
  });
});

describe('AirplanesLiveProvider', () => {
  it('builds the point URL from bounds and parses results', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, json: async () => RAW,
    } as Response);
    vi.stubGlobal('fetch', fetchMock);
    const provider = new AirplanesLiveProvider();
    const out = await provider.poll({ north: 52, south: 51, east: 0, west: -1 });
    expect(fetchMock).toHaveBeenCalledOnce();
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toMatch(/api\.airplanes\.live\/v2\/point\//);
    expect(out).toHaveLength(3);
    expect(out[0].hex).toBe('402f72');
  });
  it('throws on HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 } as Response));
    await expect(new AirplanesLiveProvider().poll(
      { north: 52, south: 51, east: 0, west: -1 })).rejects.toThrow(/429/);
  });
});
```

- [ ] **Step 3: Run, verify fail**

Run: `npm test -- --run src/data/airplanesLive.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 4: Implement `src/data/airplanesLive.ts`**

```ts
import type { Aircraft } from '../types';
import type { Bounds } from '../util/geo';
import { boundsCenter, boundsRadiusNm } from '../util/geo';
import type { FlightProvider } from './provider';

interface RawAircraft {
  hex: string; flight?: string; r?: string; t?: string; desc?: string;
  alt_baro?: number | 'ground'; gs?: number; track?: number; baro_rate?: number;
  squawk?: string; emergency?: string; category?: string; dbFlags?: number;
  lat?: number; lon?: number; seen?: number; dst?: number;
}

export function normalizeAircraft(raw: RawAircraft, now: number): Aircraft {
  const onGround = raw.alt_baro === 'ground';
  const altitude = typeof raw.alt_baro === 'number' ? raw.alt_baro : null;
  return {
    hex: raw.hex,
    callsign: raw.flight ? raw.flight.trim() || null : null,
    registration: raw.r ?? null,
    type: raw.t ?? null,
    description: raw.desc ?? null,
    lat: raw.lat ?? 0,
    lon: raw.lon ?? 0,
    altitude,
    onGround,
    groundSpeed: typeof raw.gs === 'number' ? raw.gs : null,
    track: typeof raw.track === 'number' ? raw.track : null,
    verticalRate: typeof raw.baro_rate === 'number' ? raw.baro_rate : null,
    squawk: raw.squawk ?? null,
    emergency: raw.emergency ?? null,
    category: raw.category ?? null,
    military: ((raw.dbFlags ?? 0) & 1) === 1,
    distanceNm: typeof raw.dst === 'number' ? raw.dst : null,
    seen: raw.seen ?? 0,
    lastUpdate: now,
  };
}

export class AirplanesLiveProvider implements FlightProvider {
  constructor(private base = 'https://api.airplanes.live/v2') {}

  async poll(bounds: Bounds): Promise<Aircraft[]> {
    const c = boundsCenter(bounds);
    const radius = boundsRadiusNm(bounds);
    const url = `${this.base}/point/${c.lat.toFixed(4)}/${c.lon.toFixed(4)}/${radius}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`airplanes.live HTTP ${res.status}`);
    const data = (await res.json()) as { ac?: RawAircraft[] };
    const now = Date.now();
    return (data.ac ?? [])
      .filter((a) => typeof a.lat === 'number' && typeof a.lon === 'number')
      .map((a) => normalizeAircraft(a, now));
  }
}
```

- [ ] **Step 5: Run, verify pass**

Run: `npm test -- --run src/data/airplanesLive.test.ts`
Expected: PASS (5 tests).

---

## Task 4: Filters + Zustand store

**Files:**
- Create: `src/store/filters.ts`, `src/store/filters.test.ts`, `src/store/useStore.ts`

- [ ] **Step 1: Write failing test `src/store/filters.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { matchesFilters } from './filters';
import { DEFAULT_FILTERS, type Aircraft } from '../types';

const base: Aircraft = {
  hex: 'x', callsign: 'BAW123', registration: 'G-AB', type: 'A320',
  description: null, lat: 51, lon: 0, altitude: 10000, onGround: false,
  groundSpeed: 300, track: 90, verticalRate: 0, squawk: '1234',
  emergency: 'none', category: 'A3', military: false, distanceNm: 5,
  seen: 1, lastUpdate: 0,
};

describe('matchesFilters', () => {
  it('passes everything with default filters', () => {
    expect(matchesFilters(base, DEFAULT_FILTERS)).toBe(true);
  });
  it('filters by altitude range', () => {
    expect(matchesFilters(base, { ...DEFAULT_FILTERS, altitudeMin: 20000 })).toBe(false);
    expect(matchesFilters(base, { ...DEFAULT_FILTERS, altitudeMax: 20000 })).toBe(true);
  });
  it('filters by type substring, case-insensitive', () => {
    expect(matchesFilters(base, { ...DEFAULT_FILTERS, type: 'a32' })).toBe(true);
    expect(matchesFilters(base, { ...DEFAULT_FILTERS, type: 'b77' })).toBe(false);
  });
  it('filters by airline callsign prefix', () => {
    expect(matchesFilters(base, { ...DEFAULT_FILTERS, airline: 'baw' })).toBe(true);
    expect(matchesFilters(base, { ...DEFAULT_FILTERS, airline: 'afr' })).toBe(false);
  });
  it('filters emergency by squawk', () => {
    expect(matchesFilters({ ...base, squawk: '7700' },
      { ...DEFAULT_FILTERS, emergency: true })).toBe(true);
    expect(matchesFilters(base, { ...DEFAULT_FILTERS, emergency: true })).toBe(false);
  });
  it('filters onGround tri-state', () => {
    expect(matchesFilters(base, { ...DEFAULT_FILTERS, onGround: true })).toBe(false);
    expect(matchesFilters({ ...base, onGround: true },
      { ...DEFAULT_FILTERS, onGround: true })).toBe(true);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- --run src/store/filters.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/store/filters.ts`**

```ts
import { EMERGENCY_SQUAWKS, type Aircraft, type Filters } from '../types';

export function isEmergency(a: Aircraft): boolean {
  if (a.squawk && (EMERGENCY_SQUAWKS as readonly string[]).includes(a.squawk)) return true;
  return a.emergency != null && a.emergency !== 'none' && a.emergency !== '';
}

export function matchesFilters(a: Aircraft, f: Filters): boolean {
  if (f.altitudeMin != null && (a.altitude ?? -Infinity) < f.altitudeMin) return false;
  if (f.altitudeMax != null && (a.altitude ?? Infinity) > f.altitudeMax) return false;
  if (f.type && !(a.type ?? '').toLowerCase().includes(f.type.toLowerCase())) return false;
  if (f.airline && !(a.callsign ?? '').toLowerCase().startsWith(f.airline.toLowerCase())) return false;
  if (f.military && !a.military) return false;
  if (f.emergency && !isEmergency(a)) return false;
  if (f.onGround !== null && a.onGround !== f.onGround) return false;
  return true;
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- --run src/store/filters.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Implement the store `src/store/useStore.ts`**

```ts
import { create } from 'zustand';
import { DEFAULT_FILTERS, type Aircraft, type Filters, type Settings } from '../types';
import type { Bounds } from '../util/geo';

const SETTINGS_KEY = 'flr.settings';

const defaultSettings: Settings = {
  geminiApiKey: '', geminiModel: 'gemini-2.5-flash', units: 'imperial',
  refreshSeconds: 6, home: null,
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
  setAircraft: (list: Aircraft[]) => void;
  select: (hex: string | null) => void;
  follow: (hex: string | null) => void;
  setFilters: (patch: Partial<Filters>) => void;
  clearFilters: () => void;
  setBounds: (b: Bounds) => void;
  setStale: (s: boolean) => void;
  updateSettings: (patch: Partial<Settings>) => void;
}

export const useStore = create<AppState>((set, get) => ({
  aircraft: new Map(),
  selectedHex: null,
  followedHex: null,
  filters: DEFAULT_FILTERS,
  bounds: null,
  settings: loadSettings(),
  stale: false,
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
}));

export function visibleAircraft(state: AppState): Aircraft[] {
  return Array.from(state.aircraft.values());
}
```

- [ ] **Step 6: Run full test suite to ensure nothing broke**

Run: `npm test -- --run`
Expected: PASS (all tests so far).

---

## Task 5: Position interpolation

**Files:**
- Create: `src/poll/interpolate.ts`, `src/poll/interpolate.test.ts`

- [ ] **Step 1: Write failing test `src/poll/interpolate.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { deadReckon } from './interpolate';
import type { Aircraft } from '../types';

const a: Aircraft = {
  hex: 'x', callsign: null, registration: null, type: null, description: null,
  lat: 51.0, lon: 0.0, altitude: 30000, onGround: false, groundSpeed: 600,
  track: 90, verticalRate: 0, squawk: null, emergency: 'none', category: null,
  military: false, distanceNm: null, seen: 0, lastUpdate: 0,
};

describe('deadReckon', () => {
  it('does not move a grounded/zero-speed aircraft', () => {
    const p = deadReckon({ ...a, groundSpeed: 0 }, 10);
    expect(p.lat).toBeCloseTo(51.0, 6);
    expect(p.lon).toBeCloseTo(0.0, 6);
  });
  it('moves east when track is 90°', () => {
    const p = deadReckon(a, 10); // 10 seconds
    expect(p.lon).toBeGreaterThan(0);
    expect(Math.abs(p.lat - 51.0)).toBeLessThan(1e-4);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- --run src/poll/interpolate.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/poll/interpolate.ts`**

```ts
import type { Aircraft } from '../types';

const KT_TO_KM_PER_S = 1.852 / 3600;
const KM_PER_DEG_LAT = 111.32;

/** Estimate a position `seconds` after the last update using speed + track. */
export function deadReckon(a: Aircraft, seconds: number): { lat: number; lon: number } {
  if (!a.groundSpeed || a.track == null || a.onGround) return { lat: a.lat, lon: a.lon };
  const distKm = a.groundSpeed * KT_TO_KM_PER_S * seconds;
  const rad = (a.track * Math.PI) / 180;
  const dLat = (distKm * Math.cos(rad)) / KM_PER_DEG_LAT;
  const kmPerDegLon = KM_PER_DEG_LAT * Math.cos((a.lat * Math.PI) / 180);
  const dLon = kmPerDegLon === 0 ? 0 : (distKm * Math.sin(rad)) / kmPerDegLon;
  return { lat: a.lat + dLat, lon: a.lon + dLon };
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- --run src/poll/interpolate.test.ts`
Expected: PASS (2 tests).

---

## Task 6: Stats aggregation (pure) + stats store

**Files:**
- Create: `src/stats/aggregate.ts`, `src/stats/aggregate.test.ts`, `src/db/idb.ts`, `src/stats/statsStore.ts`

- [ ] **Step 1: Write failing test `src/stats/aggregate.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { mergeSightings, summarize } from './aggregate';
import type { Sighting, Aircraft } from '../types';

function ac(hex: string, type: string | null, cs: string | null): Aircraft {
  return { hex, callsign: cs, registration: null, type, description: null,
    lat: 0, lon: 0, altitude: 1000, onGround: false, groundSpeed: 100, track: 0,
    verticalRate: 0, squawk: null, emergency: 'none', category: null,
    military: false, distanceNm: null, seen: 0, lastUpdate: 0 };
}

describe('mergeSightings', () => {
  it('adds new and increments existing', () => {
    const prev: Sighting[] = [];
    const t = 1000;
    const a = mergeSightings(prev, [ac('a', 'A320', 'X1')], t);
    expect(a).toHaveLength(1);
    expect(a[0].count).toBe(1);
    const b = mergeSightings(a, [ac('a', 'A320', 'X1')], t + 5000);
    expect(b[0].count).toBe(2);
    expect(b[0].lastSeen).toBe(t + 5000);
  });
});

describe('summarize', () => {
  it('counts types and finds rarest', () => {
    const s: Sighting[] = [
      { hex: 'a', type: 'A320', callsign: null, firstSeen: 0, lastSeen: 0, count: 5 },
      { hex: 'b', type: 'A320', callsign: null, firstSeen: 0, lastSeen: 0, count: 5 },
      { hex: 'c', type: 'C17', callsign: null, firstSeen: 0, lastSeen: 0, count: 1 },
    ];
    const sum = summarize(s);
    expect(sum.totalUnique).toBe(3);
    expect(sum.byType.find((t) => t.type === 'A320')!.count).toBe(2);
    expect(sum.rarest[0].type).toBe('C17');
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- --run src/stats/aggregate.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/stats/aggregate.ts`**

```ts
import type { Aircraft, Sighting } from '../types';

export function mergeSightings(prev: Sighting[], current: Aircraft[], now: number): Sighting[] {
  const byHex = new Map(prev.map((s) => [s.hex, { ...s }]));
  for (const a of current) {
    const existing = byHex.get(a.hex);
    if (existing) {
      existing.count += 1;
      existing.lastSeen = now;
      if (a.type) existing.type = a.type;
      if (a.callsign) existing.callsign = a.callsign;
    } else {
      byHex.set(a.hex, {
        hex: a.hex, type: a.type, callsign: a.callsign,
        firstSeen: now, lastSeen: now, count: 1,
      });
    }
  }
  return Array.from(byHex.values());
}

export interface StatsSummary {
  totalUnique: number;
  byType: { type: string; count: number }[];   // sorted desc
  rarest: { type: string; count: number }[];    // sorted asc
}

export function summarize(sightings: Sighting[]): StatsSummary {
  const counts = new Map<string, number>();
  for (const s of sightings) {
    const t = s.type ?? 'Unknown';
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const byType = Array.from(counts, ([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
  const rarest = [...byType].sort((a, b) => a.count - b.count);
  return { totalUnique: sightings.length, byType, rarest };
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- --run src/stats/aggregate.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Implement shared IndexedDB wrapper `src/db/idb.ts`**

```ts
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Sighting, AlertRule } from '../types';

interface FlrDB extends DBSchema {
  sightings: { key: string; value: Sighting };
  alerts: { key: string; value: AlertRule };
  enrichCache: { key: string; value: { key: string; data: unknown; ts: number } };
}

let dbPromise: Promise<IDBPDatabase<FlrDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<FlrDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FlrDB>('flightradar', 1, {
      upgrade(db) {
        db.createObjectStore('sightings', { keyPath: 'hex' });
        db.createObjectStore('alerts', { keyPath: 'id' });
        db.createObjectStore('enrichCache', { keyPath: 'key' });
      },
    });
  }
  return dbPromise;
}
```

- [ ] **Step 6: Implement `src/stats/statsStore.ts`**

```ts
import { getDb } from '../db/idb';
import { mergeSightings, summarize, type StatsSummary } from './aggregate';
import type { Aircraft, Sighting } from '../types';

export async function recordSightings(current: Aircraft[], now: number): Promise<void> {
  const db = await getDb();
  const prev = await db.getAll('sightings');
  const merged = mergeSightings(prev, current, now);
  const tx = db.transaction('sightings', 'readwrite');
  await Promise.all(merged.map((s) => tx.store.put(s)));
  await tx.done;
}

export async function getSummary(): Promise<StatsSummary> {
  const db = await getDb();
  const all = (await db.getAll('sightings')) as Sighting[];
  return summarize(all);
}

export async function getAllSightings(): Promise<Sighting[]> {
  return (await getDb()).getAll('sightings');
}

export async function clearStats(): Promise<void> {
  await (await getDb()).clear('sightings');
}
```

---

## Task 7: Alert engine (pure) + alert store

**Files:**
- Create: `src/alerts/engine.ts`, `src/alerts/engine.test.ts`, `src/alerts/alertStore.ts`

- [ ] **Step 1: Write failing test `src/alerts/engine.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { matchCriteria, findMatches } from './engine';
import type { Aircraft, AlertRule } from '../types';

function ac(p: Partial<Aircraft>): Aircraft {
  return { hex: 'h', callsign: 'BAW1', registration: 'G-AB', type: 'A320',
    description: null, lat: 51, lon: 0, altitude: 10000, onGround: false,
    groundSpeed: 300, track: 0, verticalRate: 0, squawk: '1000',
    emergency: 'none', category: null, military: false, distanceNm: null,
    seen: 0, lastUpdate: 0, ...p };
}

describe('matchCriteria', () => {
  const home = { lat: 51.0, lon: 0.0 };
  it('matches by type', () => {
    expect(matchCriteria(ac({}), { type: 'A320' }, home)).toBe(true);
    expect(matchCriteria(ac({}), { type: 'B747' }, home)).toBe(false);
  });
  it('matches emergency squawk', () => {
    expect(matchCriteria(ac({ squawk: '7700' }), { emergency: true }, home)).toBe(true);
    expect(matchCriteria(ac({}), { emergency: true }, home)).toBe(false);
  });
  it('matches below altitude', () => {
    expect(matchCriteria(ac({ altitude: 2000 }), { belowAltitude: 5000 }, home)).toBe(true);
    expect(matchCriteria(ac({ altitude: 9000 }), { belowAltitude: 5000 }, home)).toBe(false);
  });
  it('matches within distance of home', () => {
    expect(matchCriteria(ac({ lat: 51.05, lon: 0 }), { withinKm: 10 }, home)).toBe(true);
    expect(matchCriteria(ac({ lat: 53, lon: 0 }), { withinKm: 10 }, home)).toBe(false);
  });
});

describe('findMatches', () => {
  it('returns one hit per (rule, aircraft) for enabled rules only', () => {
    const rules: AlertRule[] = [
      { id: '1', name: 'jumbos', enabled: true, criteria: { type: 'B747' } },
      { id: '2', name: 'off', enabled: false, criteria: { type: 'A320' } },
    ];
    const list = [ac({ hex: 'a', type: 'B747' }), ac({ hex: 'b', type: 'A320' })];
    const hits = findMatches(list, rules, null);
    expect(hits).toHaveLength(1);
    expect(hits[0].rule.id).toBe('1');
    expect(hits[0].aircraft.hex).toBe('a');
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- --run src/alerts/engine.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/alerts/engine.ts`**

```ts
import type { Aircraft, AlertCriteria, AlertRule } from '../types';
import { isEmergency } from '../store/filters';
import { haversineKm } from '../util/geo';

export function matchCriteria(
  a: Aircraft, c: AlertCriteria, home: { lat: number; lon: number } | null,
): boolean {
  if (c.type && (a.type ?? '').toUpperCase() !== c.type.toUpperCase()) return false;
  if (c.airlinePrefix && !(a.callsign ?? '').toUpperCase().startsWith(c.airlinePrefix.toUpperCase())) return false;
  if (c.military && !a.military) return false;
  if (c.emergency && !isEmergency(a)) return false;
  if (c.belowAltitude != null && (a.altitude ?? Infinity) >= c.belowAltitude) return false;
  if (c.registration && (a.registration ?? '').toUpperCase() !== c.registration.toUpperCase()) return false;
  if (c.callsign && (a.callsign ?? '').toUpperCase() !== c.callsign.toUpperCase()) return false;
  if (c.withinKm != null) {
    if (!home) return false;
    if (haversineKm(home.lat, home.lon, a.lat, a.lon) > c.withinKm) return false;
  }
  return true;
}

export interface AlertHit { rule: AlertRule; aircraft: Aircraft }

export function findMatches(
  list: Aircraft[], rules: AlertRule[], home: { lat: number; lon: number } | null,
): AlertHit[] {
  const hits: AlertHit[] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    for (const a of list) {
      if (matchCriteria(a, rule.criteria, home)) hits.push({ rule, aircraft: a });
    }
  }
  return hits;
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- --run src/alerts/engine.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Implement `src/alerts/alertStore.ts`**

```ts
import { getDb } from '../db/idb';
import { findMatches, type AlertHit } from './engine';
import type { Aircraft, AlertRule } from '../types';

const lastFired = new Map<string, number>();   // `${ruleId}:${hex}` -> epoch ms
const DEBOUNCE_MS = 5 * 60 * 1000;

export async function listRules(): Promise<AlertRule[]> {
  return (await getDb()).getAll('alerts');
}
export async function saveRule(rule: AlertRule): Promise<void> {
  await (await getDb()).put('alerts', rule);
}
export async function deleteRule(id: string): Promise<void> {
  await (await getDb()).delete('alerts', id);
}

export function notify(hit: AlertHit): void {
  const title = `✈ ${hit.rule.name}`;
  const body = `${hit.aircraft.callsign ?? hit.aircraft.hex} (${hit.aircraft.type ?? '?'})`;
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
  window.dispatchEvent(new CustomEvent('flr-toast', { detail: `${title}: ${body}` }));
}

/** Evaluate rules against current aircraft, firing (debounced) notifications. */
export async function evaluateAlerts(
  list: Aircraft[], home: { lat: number; lon: number } | null,
): Promise<void> {
  const rules = await listRules();
  const hits = findMatches(list, rules, home);
  const now = Date.now();
  for (const hit of hits) {
    const key = `${hit.rule.id}:${hit.aircraft.hex}`;
    const prev = lastFired.get(key) ?? 0;
    if (now - prev < DEBOUNCE_MS) continue;
    lastFired.set(key, now);
    notify(hit);
  }
}
```

---

## Task 8: Enrichment (adsbdb)

**Files:**
- Create: `src/enrich/adsbdb.ts`, `src/enrich/adsbdb.test.ts`

- [ ] **Step 1: Write failing test `src/enrich/adsbdb.test.ts`**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseRoute, parseAircraftInfo } from './adsbdb';

afterEach(() => vi.restoreAllMocks());

const ROUTE = { response: { flightroute: {
  callsign: 'BAW46EZ',
  airline: { name: 'British Airways', icao: 'BAW', iata: 'BA' },
  origin: { iata_code: 'LHR', icao_code: 'EGLL', name: 'London Heathrow', municipality: 'London' },
  destination: { iata_code: 'MAD', icao_code: 'LEMD', name: 'Madrid Barajas', municipality: 'Madrid' },
} } };

const AIRCRAFT = { response: { aircraft: {
  type: '777 236ER', icao_type: 'B772', manufacturer: 'Boeing',
  registration: 'G-YMML', registered_owner: 'British Airways',
  url_photo_thumbnail: 'https://x/thumb.jpg',
} } };

describe('parseRoute', () => {
  it('extracts origin, destination, airline', () => {
    const r = parseRoute(ROUTE)!;
    expect(r.airline).toBe('British Airways');
    expect(r.originIata).toBe('LHR');
    expect(r.destinationIata).toBe('MAD');
  });
  it('returns null for an unknown-callsign response', () => {
    expect(parseRoute({ response: 'unknown callsign' })).toBeNull();
  });
});

describe('parseAircraftInfo', () => {
  it('extracts owner, type, photo', () => {
    const a = parseAircraftInfo(AIRCRAFT)!;
    expect(a.owner).toBe('British Airways');
    expect(a.icaoType).toBe('B772');
    expect(a.photoThumb).toContain('thumb.jpg');
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- --run src/enrich/adsbdb.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/enrich/adsbdb.ts`**

```ts
import { getDb } from '../db/idb';

export interface RouteInfo {
  airline: string | null;
  originIata: string | null; originName: string | null;
  destinationIata: string | null; destinationName: string | null;
}
export interface AircraftInfo {
  owner: string | null; manufacturer: string | null;
  type: string | null; icaoType: string | null; photoThumb: string | null;
}

export function parseRoute(json: unknown): RouteInfo | null {
  const fr = (json as any)?.response?.flightroute;
  if (!fr) return null;
  return {
    airline: fr.airline?.name ?? null,
    originIata: fr.origin?.iata_code ?? null,
    originName: fr.origin?.name ?? null,
    destinationIata: fr.destination?.iata_code ?? null,
    destinationName: fr.destination?.name ?? null,
  };
}

export function parseAircraftInfo(json: unknown): AircraftInfo | null {
  const a = (json as any)?.response?.aircraft;
  if (!a) return null;
  return {
    owner: a.registered_owner ?? null,
    manufacturer: a.manufacturer ?? null,
    type: a.type ?? null,
    icaoType: a.icao_type ?? null,
    photoThumb: a.url_photo_thumbnail ?? null,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

async function cached<T>(key: string, loader: () => Promise<T | null>): Promise<T | null> {
  const db = await getDb();
  const hit = await db.get('enrichCache', key);
  if (hit && Date.now() - hit.ts < DAY_MS) return hit.data as T;
  const data = await loader();
  if (data) await db.put('enrichCache', { key, data, ts: Date.now() });
  return data;
}

export function getRoute(callsign: string): Promise<RouteInfo | null> {
  return cached(`route:${callsign}`, async () => {
    try {
      const res = await fetch(`https://api.adsbdb.com/v0/callsign/${encodeURIComponent(callsign)}`);
      if (!res.ok) return null;
      return parseRoute(await res.json());
    } catch { return null; }
  });
}

export function getAircraftInfo(idOrReg: string): Promise<AircraftInfo | null> {
  return cached(`ac:${idOrReg}`, async () => {
    try {
      const res = await fetch(`https://api.adsbdb.com/v0/aircraft/${encodeURIComponent(idOrReg)}`);
      if (!res.ok) return null;
      return parseAircraftInfo(await res.json());
    } catch { return null; }
  });
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- --run src/enrich/adsbdb.test.ts`
Expected: PASS (4 tests).

---

## Task 9: Aircraft map layer (GeoJSON builder) + MapView

**Files:**
- Create: `src/map/icons.ts`, `src/map/aircraftLayer.ts`, `src/map/aircraftLayer.test.ts`, `src/map/MapView.tsx`

- [ ] **Step 1: Write failing test `src/map/aircraftLayer.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { toGeoJSON } from './aircraftLayer';
import type { Aircraft } from '../types';

function ac(p: Partial<Aircraft>): Aircraft {
  return { hex: 'h', callsign: 'BAW1', registration: null, type: 'A320',
    description: null, lat: 51, lon: 0, altitude: 10000, onGround: false,
    groundSpeed: 300, track: 90, verticalRate: 0, squawk: '1000',
    emergency: 'none', category: 'A3', military: false, distanceNm: null,
    seen: 0, lastUpdate: 0, ...p };
}

describe('toGeoJSON', () => {
  it('emits a Point feature per aircraft with rotation + emergency props', () => {
    const fc = toGeoJSON([ac({ hex: 'a' }), ac({ hex: 'b', squawk: '7700' })], null);
    expect(fc.features).toHaveLength(2);
    expect(fc.features[0].geometry.coordinates).toEqual([0, 51]);
    expect(fc.features[0].properties.rotation).toBe(90);
    expect(fc.features[1].properties.emergency).toBe(true);
  });
  it('flags the selected aircraft', () => {
    const fc = toGeoJSON([ac({ hex: 'a' })], 'a');
    expect(fc.features[0].properties.selected).toBe(true);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- --run src/map/aircraftLayer.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/map/aircraftLayer.ts`**

```ts
import type { Aircraft } from '../types';
import { isEmergency } from '../store/filters';

export interface AircraftFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    hex: string; callsign: string; rotation: number;
    emergency: boolean; selected: boolean; military: boolean; onGround: boolean;
  };
}
export interface AircraftFC { type: 'FeatureCollection'; features: AircraftFeature[] }

export function toGeoJSON(list: Aircraft[], selectedHex: string | null): AircraftFC {
  return {
    type: 'FeatureCollection',
    features: list.map((a) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [a.lon, a.lat] },
      properties: {
        hex: a.hex,
        callsign: a.callsign ?? a.hex,
        rotation: a.track ?? 0,
        emergency: isEmergency(a),
        selected: a.hex === selectedHex,
        military: a.military,
        onGround: a.onGround,
      },
    })),
  };
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- --run src/map/aircraftLayer.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Implement the plane icon `src/map/icons.ts`**

```ts
/** A simple north-pointing plane silhouette as an SDF-free image (data URL). */
export const PLANE_PNG =
  'data:image/svg+xml;base64,' +
  btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <path d="M16 2 L19 14 L30 20 L30 23 L18 19 L18 27 L22 30 L22 31 L16 29 L10 31 L10 30 L14 27 L14 19 L2 23 L2 20 L13 14 Z"
      fill="#1d4ed8" stroke="#fff" stroke-width="1"/></svg>`);

export async function loadPlaneImage(): Promise<ImageBitmap> {
  const res = await fetch(PLANE_PNG);
  return createImageBitmap(await res.blob());
}
```

- [ ] **Step 6: Implement `src/map/MapView.tsx`**

```tsx
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStore } from '../store/useStore';
import { matchesFilters } from '../store/filters';
import { toGeoJSON } from './aircraftLayer';
import { loadPlaneImage } from './icons';
import { deadReckon } from '../poll/interpolate';

const STYLE = 'https://tiles.openfreemap.org/styles/positron';
const SRC = 'aircraft';

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current, style: STYLE, center: [-0.45, 51.47], zoom: 9,
    });
    mapRef.current = map;

    map.on('load', async () => {
      const img = await loadPlaneImage();
      map.addImage('plane', img);
      map.addSource(SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'aircraft-layer', type: 'symbol', source: SRC,
        layout: {
          'icon-image': 'plane', 'icon-rotate': ['get', 'rotation'],
          'icon-allow-overlap': true, 'icon-size': 0.8,
          'icon-rotation-alignment': 'map',
        },
        paint: {
          'icon-color': ['case', ['get', 'emergency'], '#dc2626',
            ['get', 'selected'], '#f59e0b', ['get', 'military'], '#16a34a', '#1d4ed8'],
        },
      });
    });

    const updateBounds = () => {
      const b = map.getBounds();
      useStore.getState().setBounds({
        north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest(),
      });
    };
    map.on('moveend', updateBounds);
    map.on('load', updateBounds);

    map.on('click', 'aircraft-layer', (e) => {
      const hex = e.features?.[0]?.properties?.hex as string | undefined;
      if (hex) useStore.getState().select(hex);
    });
    map.on('mouseenter', 'aircraft-layer', () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('mouseleave', 'aircraft-layer', () => (map.getCanvas().style.cursor = ''));

    return () => map.remove();
  }, []);

  // Smooth render loop: re-project with dead reckoning every animation frame.
  useEffect(() => {
    let raf = 0;
    const render = () => {
      const map = mapRef.current;
      const state = useStore.getState();
      if (map && map.getSource(SRC)) {
        const filtered = Array.from(state.aircraft.values()).filter((a) =>
          matchesFilters(a, state.filters));
        const projected = filtered.map((a) => {
          const secs = (Date.now() - a.lastUpdate) / 1000;
          const p = deadReckon(a, secs);
          return { ...a, lat: p.lat, lon: p.lon };
        });
        (map.getSource(SRC) as maplibregl.GeoJSONSource).setData(
          toGeoJSON(projected, state.selectedHex));
        if (state.followedHex) {
          const f = state.aircraft.get(state.followedHex);
          if (f) map.easeTo({ center: [f.lon, f.lat], duration: 800 });
        }
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />;
}
```

- [ ] **Step 7: Manual verify**

Temporarily render `<MapView />` from `App.tsx`, run `npm run dev`, confirm the basemap renders centered near London with no console errors. (No aircraft yet — that comes in Task 10.) Revert `App.tsx` if needed.

---

## Task 10: Poll loop wiring

**Files:**
- Create: `src/poll/pollLoop.ts`, `src/poll/pollLoop.test.ts`

- [ ] **Step 1: Write failing test `src/poll/pollLoop.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';
import { runOnce } from './pollLoop';
import type { Aircraft } from '../types';
import type { FlightProvider } from '../data/provider';

const sample: Aircraft[] = [{
  hex: 'a', callsign: 'BAW1', registration: null, type: 'A320', description: null,
  lat: 51, lon: 0, altitude: 10000, onGround: false, groundSpeed: 300, track: 0,
  verticalRate: 0, squawk: '1000', emergency: 'none', category: null,
  military: false, distanceNm: null, seen: 0, lastUpdate: 0,
}];

describe('runOnce', () => {
  it('fetches, then calls each sink with the result', async () => {
    const provider: FlightProvider = { poll: vi.fn().mockResolvedValue(sample) };
    const onAircraft = vi.fn();
    const onStats = vi.fn().mockResolvedValue(undefined);
    const onAlerts = vi.fn().mockResolvedValue(undefined);
    await runOnce(provider, { north: 52, south: 51, east: 1, west: -1 },
      { onAircraft, onStats, onAlerts, home: null });
    expect(onAircraft).toHaveBeenCalledWith(sample);
    expect(onStats).toHaveBeenCalledWith(sample, expect.any(Number));
    expect(onAlerts).toHaveBeenCalledWith(sample, null);
  });
  it('reports an error via onError and does not throw', async () => {
    const provider: FlightProvider = { poll: vi.fn().mockRejectedValue(new Error('boom')) };
    const onError = vi.fn();
    await runOnce(provider, { north: 52, south: 51, east: 1, west: -1 },
      { onAircraft: vi.fn(), onStats: vi.fn(), onAlerts: vi.fn(), home: null, onError });
    expect(onError).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- --run src/poll/pollLoop.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/poll/pollLoop.ts`**

```ts
import type { Aircraft } from '../types';
import type { Bounds } from '../util/geo';
import type { FlightProvider } from '../data/provider';

export interface PollSinks {
  onAircraft: (list: Aircraft[]) => void;
  onStats: (list: Aircraft[], now: number) => Promise<void> | void;
  onAlerts: (list: Aircraft[], home: { lat: number; lon: number } | null) => Promise<void> | void;
  home: { lat: number; lon: number } | null;
  onError?: (err: unknown) => void;
}

export async function runOnce(
  provider: FlightProvider, bounds: Bounds, sinks: PollSinks,
): Promise<void> {
  try {
    const list = await provider.poll(bounds);
    sinks.onAircraft(list);
    await sinks.onStats(list, Date.now());
    await sinks.onAlerts(list, sinks.home);
  } catch (err) {
    sinks.onError?.(err);
  }
}

export interface PollHandle { stop: () => void }

/** Start a polling loop driven by the current bounds getter. */
export function startPolling(
  provider: FlightProvider, getBounds: () => Bounds | null,
  sinks: PollSinks, intervalMs: () => number,
): PollHandle {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;
  const tick = async () => {
    if (stopped) return;
    const bounds = getBounds();
    if (bounds) await runOnce(provider, bounds, sinks);
    if (!stopped) timer = setTimeout(tick, intervalMs());
  };
  tick();
  return { stop: () => { stopped = true; clearTimeout(timer); } };
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- --run src/poll/pollLoop.test.ts`
Expected: PASS (2 tests).

---

## Task 11: AI assistant tools (declarations + dispatcher)

**Files:**
- Create: `src/ai/tools.ts`, `src/ai/tools.test.ts`, `src/ai/systemPrompt.ts`

- [ ] **Step 1: Write failing test `src/ai/tools.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';
import { dispatchTool, toolDeclarations, type ToolActions } from './tools';
import type { Aircraft } from '../types';

function ac(p: Partial<Aircraft>): Aircraft {
  return { hex: 'a', callsign: 'BAW1', registration: 'G-AB', type: 'A320',
    description: null, lat: 51, lon: 0, altitude: 10000, onGround: false,
    groundSpeed: 300, track: 0, verticalRate: 0, squawk: '1000',
    emergency: 'none', category: null, military: false, distanceNm: null,
    seen: 0, lastUpdate: 0, ...p };
}

function actions(): ToolActions {
  return {
    setMapView: vi.fn(),
    setFilter: vi.fn(),
    clearFilters: vi.fn(),
    trackAircraft: vi.fn().mockReturnValue(true),
    untrack: vi.fn(),
    getVisibleAircraft: vi.fn().mockReturnValue([ac({ hex: 'a', type: 'A320' }), ac({ hex: 'b', type: 'B744', callsign: 'BAW2' })]),
    getAircraftDetails: vi.fn().mockResolvedValue({ live: ac({}), route: null, info: null }),
    getRoute: vi.fn().mockResolvedValue(null),
    createAlert: vi.fn().mockResolvedValue('id-1'),
    listAlerts: vi.fn().mockResolvedValue([]),
    deleteAlert: vi.fn().mockResolvedValue(undefined),
    queryStats: vi.fn().mockResolvedValue({ totalUnique: 2, byType: [], rarest: [] }),
  };
}

describe('toolDeclarations', () => {
  it('exposes the expected tool names', () => {
    const names = toolDeclarations.map((d) => d.name);
    expect(names).toContain('queryFlights');
    expect(names).toContain('createAlert');
    expect(names).toContain('setMapView');
    expect(names).toContain('queryStats');
  });
});

describe('dispatchTool', () => {
  it('queryFlights filters visible aircraft by type', async () => {
    const a = actions();
    const out = await dispatchTool('queryFlights', { type: 'B744' }, a);
    expect(out.count).toBe(1);
    expect(out.aircraft[0].hex).toBe('b');
  });
  it('setMapView calls the action and returns ok', async () => {
    const a = actions();
    const out = await dispatchTool('setMapView', { lat: 40, lon: -73, zoom: 8 }, a);
    expect(a.setMapView).toHaveBeenCalledWith(40, -73, 8);
    expect(out.ok).toBe(true);
  });
  it('createAlert returns the new id', async () => {
    const a = actions();
    const out = await dispatchTool('createAlert', { name: 'jumbos', type: 'B744' }, a);
    expect(out.id).toBe('id-1');
  });
  it('returns an error object for an unknown tool', async () => {
    const out = await dispatchTool('nope', {}, actions());
    expect(out.error).toMatch(/unknown tool/i);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- --run src/ai/tools.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/ai/tools.ts`**

```ts
import type { Aircraft, AlertCriteria } from '../types';
import type { RouteInfo, AircraftInfo } from '../enrich/adsbdb';
import type { StatsSummary } from '../stats/aggregate';

export interface AircraftDetails { live: Aircraft | null; route: RouteInfo | null; info: AircraftInfo | null }

export interface ToolActions {
  setMapView: (lat: number, lon: number, zoom: number) => void;
  setFilter: (patch: Record<string, unknown>) => void;
  clearFilters: () => void;
  trackAircraft: (hex: string) => boolean;
  untrack: () => void;
  getVisibleAircraft: () => Aircraft[];
  getAircraftDetails: (idOrReg: string) => Promise<AircraftDetails>;
  getRoute: (callsign: string) => Promise<RouteInfo | null>;
  createAlert: (name: string, criteria: AlertCriteria) => Promise<string>;
  listAlerts: () => Promise<{ id: string; name: string }[]>;
  deleteAlert: (id: string) => Promise<void>;
  queryStats: () => Promise<StatsSummary>;
}

// Gemini FunctionDeclaration shape (kept loose to avoid SDK type coupling).
export const toolDeclarations = [
  { name: 'setMapView', description: 'Center/zoom the map.',
    parameters: { type: 'object', properties: {
      lat: { type: 'number' }, lon: { type: 'number' }, zoom: { type: 'number' } },
      required: ['lat', 'lon', 'zoom'] } },
  { name: 'setFilter', description: 'Filter visible aircraft. Fields: altitudeMin, altitudeMax, type, airline, military, emergency, onGround.',
    parameters: { type: 'object', properties: {
      altitudeMin: { type: 'number' }, altitudeMax: { type: 'number' },
      type: { type: 'string' }, airline: { type: 'string' },
      military: { type: 'boolean' }, emergency: { type: 'boolean' },
      onGround: { type: 'boolean' } } } },
  { name: 'clearFilters', description: 'Remove all filters.', parameters: { type: 'object', properties: {} } },
  { name: 'queryFlights', description: 'Return currently visible aircraft matching optional criteria (type, airline callsign prefix, military, emergency, belowAltitude).',
    parameters: { type: 'object', properties: {
      type: { type: 'string' }, airline: { type: 'string' },
      military: { type: 'boolean' }, emergency: { type: 'boolean' },
      belowAltitude: { type: 'number' } } } },
  { name: 'trackAircraft', description: 'Follow an aircraft by hex id; the map keeps it centered.',
    parameters: { type: 'object', properties: { hex: { type: 'string' } }, required: ['hex'] } },
  { name: 'untrack', description: 'Stop following.', parameters: { type: 'object', properties: {} } },
  { name: 'getAircraftDetails', description: 'Live state + airline/owner/route for a hex id or registration.',
    parameters: { type: 'object', properties: { idOrReg: { type: 'string' } }, required: ['idOrReg'] } },
  { name: 'getRoute', description: 'Origin/destination/airline for a callsign.',
    parameters: { type: 'object', properties: { callsign: { type: 'string' } }, required: ['callsign'] } },
  { name: 'createAlert', description: 'Create an alert rule. Provide name and any of: type, airlinePrefix, military, emergency, belowAltitude, withinKm, registration, callsign.',
    parameters: { type: 'object', properties: {
      name: { type: 'string' }, type: { type: 'string' }, airlinePrefix: { type: 'string' },
      military: { type: 'boolean' }, emergency: { type: 'boolean' },
      belowAltitude: { type: 'number' }, withinKm: { type: 'number' },
      registration: { type: 'string' }, callsign: { type: 'string' } },
      required: ['name'] } },
  { name: 'listAlerts', description: 'List existing alert rules.', parameters: { type: 'object', properties: {} } },
  { name: 'deleteAlert', description: 'Delete an alert rule by id.',
    parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  { name: 'queryStats', description: 'Summary of aircraft seen this session: totals, counts by type, rarest types.',
    parameters: { type: 'object', properties: {} } },
];

function summarizeAircraft(a: Aircraft) {
  return { hex: a.hex, callsign: a.callsign, type: a.type, registration: a.registration,
    altitude: a.altitude, groundSpeed: a.groundSpeed, squawk: a.squawk,
    military: a.military, onGround: a.onGround };
}

export async function dispatchTool(
  name: string, args: Record<string, any>, actions: ToolActions,
): Promise<Record<string, any>> {
  switch (name) {
    case 'setMapView':
      actions.setMapView(args.lat, args.lon, args.zoom);
      return { ok: true };
    case 'setFilter':
      actions.setFilter(args);
      return { ok: true };
    case 'clearFilters':
      actions.clearFilters();
      return { ok: true };
    case 'queryFlights': {
      const list = actions.getVisibleAircraft().filter((a) => {
        if (args.type && (a.type ?? '').toLowerCase() !== String(args.type).toLowerCase()) return false;
        if (args.airline && !(a.callsign ?? '').toLowerCase().startsWith(String(args.airline).toLowerCase())) return false;
        if (args.military && !a.military) return false;
        if (args.emergency && !(a.squawk && ['7500','7600','7700'].includes(a.squawk))) return false;
        if (args.belowAltitude != null && (a.altitude ?? Infinity) >= args.belowAltitude) return false;
        return true;
      });
      return { count: list.length, aircraft: list.slice(0, 30).map(summarizeAircraft) };
    }
    case 'trackAircraft':
      return { ok: actions.trackAircraft(args.hex) };
    case 'untrack':
      actions.untrack();
      return { ok: true };
    case 'getAircraftDetails': {
      const d = await actions.getAircraftDetails(args.idOrReg);
      return { live: d.live ? summarizeAircraft(d.live) : null, route: d.route, info: d.info };
    }
    case 'getRoute':
      return { route: await actions.getRoute(args.callsign) };
    case 'createAlert': {
      const { name: alertName, ...criteria } = args;
      const id = await actions.createAlert(alertName, criteria as AlertCriteria);
      return { id };
    }
    case 'listAlerts':
      return { alerts: await actions.listAlerts() };
    case 'deleteAlert':
      await actions.deleteAlert(args.id);
      return { ok: true };
    case 'queryStats':
      return await actions.queryStats();
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- --run src/ai/tools.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Implement `src/ai/systemPrompt.ts`**

```ts
export const SYSTEM_PROMPT = `You are the in-app AI assistant for a live flight-tracking web app for aviation enthusiasts.

You can SEE only what tools return. To answer about aircraft currently on the map, call queryFlights. To move/zoom the map, call setMapView or setFilter. To follow an aircraft, call trackAircraft with its hex id. To create monitoring alerts, call createAlert. For session statistics (rarest/most common types seen), call queryStats. For details about a specific aircraft or route, call getAircraftDetails or getRoute.

You have deep aviation knowledge: explain squawk codes (7500 hijack, 7600 radio failure, 7700 emergency), holding patterns, why an aircraft might be circling (holding, photo/survey, medical, training), callsign and registration conventions, aircraft type codes, and airline ICAO/IATA codes. Use it to interpret tool results for the user.

Be concise. When the user asks you to do something to the map, actually call the tool rather than describing it. After acting, briefly confirm what you did. Coordinates use decimal degrees; altitudes are in feet; speeds in knots unless the user prefers metric.`;
```

---

## Task 12: Gemini assistant client

**Files:**
- Create: `src/ai/assistant.ts`

- [ ] **Step 1: Implement `src/ai/assistant.ts`** (manually verified; network-dependent, no unit test)

```ts
import { GoogleGenerativeAI, type FunctionDeclaration } from '@google/generative-ai';
import { SYSTEM_PROMPT } from './systemPrompt';
import { toolDeclarations, dispatchTool, type ToolActions } from './tools';

export interface ChatTurn { role: 'user' | 'model'; text: string }

export class Assistant {
  private model;
  constructor(apiKey: string, modelName: string, private actions: ToolActions) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ functionDeclarations: toolDeclarations as unknown as FunctionDeclaration[] }],
    });
  }

  /** Send a user message; resolves to the assistant's final text after any tool calls. */
  async send(history: ChatTurn[], message: string): Promise<string> {
    const chat = this.model.startChat({
      history: history.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    });
    let result = await chat.sendMessage(message);
    // Tool-call loop: keep dispatching until the model returns plain text.
    for (let i = 0; i < 5; i++) {
      const calls = result.response.functionCalls();
      if (!calls || calls.length === 0) break;
      const responses = await Promise.all(calls.map(async (c) => ({
        functionResponse: {
          name: c.name,
          response: await dispatchTool(c.name, (c.args ?? {}) as Record<string, any>, this.actions),
        },
      })));
      result = await chat.sendMessage(responses as any);
    }
    return result.response.text();
  }
}
```

- [ ] **Step 2: Manual check (after Task 13 UI exists)**

Defer live verification to Task 13's manual check, which exercises this through the chat panel. (Requires a Gemini API key in Settings.)

---

## Task 13: UI shell + components

**Files:**
- Create: `src/ui/Toasts.tsx`, `src/ui/SearchBox.tsx`, `src/ui/FilterBar.tsx`, `src/ui/FlightList.tsx`, `src/ui/DetailPanel.tsx`, `src/ui/Settings.tsx`, `src/ui/AlertsManager.tsx`, `src/ui/StatsDashboard.tsx`, `src/ui/ChatPanel.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`

> These are React/DOM components verified by running the app. Build them in this order; after the last, do the manual end-to-end check in Step 11.

- [ ] **Step 1: `src/ui/Toasts.tsx`** — listens for `flr-toast` events and renders transient messages.

```tsx
import { useEffect, useState } from 'react';

export default function Toasts() {
  const [items, setItems] = useState<{ id: number; text: string }[]>([]);
  useEffect(() => {
    let n = 0;
    const handler = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      const id = ++n;
      setItems((s) => [...s, { id, text }]);
      setTimeout(() => setItems((s) => s.filter((i) => i.id !== id)), 6000);
    };
    window.addEventListener('flr-toast', handler);
    return () => window.removeEventListener('flr-toast', handler);
  }, []);
  return (
    <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 30, display: 'grid', gap: 8 }}>
      {items.map((i) => (
        <div key={i.id} style={{ background: '#111827', color: '#fff', padding: '8px 12px',
          borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,.3)', maxWidth: 280 }}>{i.text}</div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: `src/ui/SearchBox.tsx`** — text search by callsign/registration/hex; selects + flies to a hit.

```tsx
import { useState } from 'react';
import { useStore } from '../store/useStore';

export default function SearchBox() {
  const [q, setQ] = useState('');
  const aircraft = useStore((s) => s.aircraft);
  const select = useStore((s) => s.select);
  const follow = useStore((s) => s.follow);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const needle = q.trim().toUpperCase();
    if (!needle) return;
    for (const a of aircraft.values()) {
      if ([a.callsign, a.registration, a.hex].some((v) => (v ?? '').toUpperCase().includes(needle))) {
        select(a.hex); follow(a.hex); break;
      }
    }
  };
  return (
    <form onSubmit={submit} style={{ padding: 8 }}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search callsign / reg / hex"
        style={{ width: '100%', padding: 8, boxSizing: 'border-box' }} />
    </form>
  );
}
```

- [ ] **Step 3: `src/ui/FilterBar.tsx`** — toggles that map to `setFilters`.

```tsx
import { useStore } from '../store/useStore';

export default function FilterBar() {
  const filters = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);
  const clearFilters = useStore((s) => s.clearFilters);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 8, alignItems: 'center' }}>
      <label><input type="checkbox" checked={filters.military}
        onChange={(e) => setFilters({ military: e.target.checked })} /> Military</label>
      <label><input type="checkbox" checked={filters.emergency}
        onChange={(e) => setFilters({ emergency: e.target.checked })} /> Emergency</label>
      <label><input type="checkbox" checked={filters.onGround === false}
        onChange={(e) => setFilters({ onGround: e.target.checked ? false : null })} /> Airborne only</label>
      <input placeholder="Type (e.g. A320)" value={filters.type ?? ''}
        onChange={(e) => setFilters({ type: e.target.value || null })} style={{ width: 110 }} />
      <input placeholder="Airline (e.g. BAW)" value={filters.airline ?? ''}
        onChange={(e) => setFilters({ airline: e.target.value || null })} style={{ width: 120 }} />
      <button onClick={clearFilters}>Clear</button>
    </div>
  );
}
```

- [ ] **Step 4: `src/ui/FlightList.tsx`** — filtered, sorted list; click selects.

```tsx
import { useStore } from '../store/useStore';
import { matchesFilters } from '../store/filters';
import { formatAltitude } from '../util/units';

export default function FlightList() {
  const aircraft = useStore((s) => s.aircraft);
  const filters = useStore((s) => s.filters);
  const units = useStore((s) => s.settings.units);
  const select = useStore((s) => s.select);
  const selectedHex = useStore((s) => s.selectedHex);
  const list = Array.from(aircraft.values())
    .filter((a) => matchesFilters(a, filters))
    .sort((a, b) => (a.distanceNm ?? 1e9) - (b.distanceNm ?? 1e9))
    .slice(0, 200);
  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      <div style={{ padding: '4px 8px', fontSize: 12, color: '#6b7280' }}>{list.length} shown</div>
      {list.map((a) => (
        <div key={a.hex} onClick={() => select(a.hex)}
          style={{ padding: '6px 8px', cursor: 'pointer', borderLeft: '3px solid',
            borderLeftColor: a.hex === selectedHex ? '#f59e0b' : 'transparent',
            background: a.hex === selectedHex ? '#f3f4f6' : 'transparent' }}>
          <strong>{a.callsign ?? a.hex}</strong>
          <span style={{ float: 'right', color: '#6b7280' }}>{a.type ?? ''}</span>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            {formatAltitude(a.altitude, units)} · {a.registration ?? ''}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: `src/ui/DetailPanel.tsx`** — selected aircraft details + lazy enrichment.

```tsx
import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { formatAltitude, formatSpeed } from '../util/units';
import { getRoute, getAircraftInfo, type RouteInfo, type AircraftInfo } from '../enrich/adsbdb';

export default function DetailPanel() {
  const selectedHex = useStore((s) => s.selectedHex);
  const aircraft = useStore((s) => s.aircraft);
  const units = useStore((s) => s.settings.units);
  const follow = useStore((s) => s.follow);
  const followedHex = useStore((s) => s.followedHex);
  const a = selectedHex ? aircraft.get(selectedHex) : null;
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [info, setInfo] = useState<AircraftInfo | null>(null);

  useEffect(() => {
    setRoute(null); setInfo(null);
    if (!a) return;
    if (a.callsign) getRoute(a.callsign).then(setRoute);
    getAircraftInfo(a.registration ?? a.hex).then(setInfo);
  }, [selectedHex]);

  if (!a) return <div style={{ padding: 12, color: '#6b7280' }}>Select an aircraft.</div>;
  return (
    <div style={{ padding: 12, borderTop: '1px solid #e5e7eb' }}>
      <h3 style={{ margin: '0 0 6px' }}>{a.callsign ?? a.hex}</h3>
      {info?.photoThumb && <img src={info.photoThumb} alt="" style={{ width: '100%', borderRadius: 6 }} />}
      <table style={{ fontSize: 13, width: '100%' }}><tbody>
        <tr><td>Reg</td><td>{a.registration ?? '—'}</td></tr>
        <tr><td>Type</td><td>{info?.type ?? a.type ?? '—'}</td></tr>
        <tr><td>Owner</td><td>{info?.owner ?? '—'}</td></tr>
        <tr><td>Altitude</td><td>{formatAltitude(a.altitude, units)}</td></tr>
        <tr><td>Speed</td><td>{formatSpeed(a.groundSpeed, units)}</td></tr>
        <tr><td>Heading</td><td>{a.track != null ? `${Math.round(a.track)}°` : '—'}</td></tr>
        <tr><td>Squawk</td><td>{a.squawk ?? '—'}</td></tr>
        {route && <tr><td>Route</td><td>{route.originIata ?? '?'} → {route.destinationIata ?? '?'}</td></tr>}
        {route?.airline && <tr><td>Airline</td><td>{route.airline}</td></tr>}
      </tbody></table>
      <button onClick={() => follow(followedHex === a.hex ? null : a.hex)}>
        {followedHex === a.hex ? 'Unfollow' : 'Follow'}</button>
    </div>
  );
}
```

- [ ] **Step 6: `src/ui/Settings.tsx`** — Gemini key/model, units, refresh rate, home, notification permission.

```tsx
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
        <input type="number" min={3} max={30} value={settings.refreshSeconds}
          onChange={(e) => update({ refreshSeconds: Number(e.target.value) })} /></label>
      <button onClick={() => navigator.geolocation.getCurrentPosition((p) =>
        update({ home: { lat: p.coords.latitude, lon: p.coords.longitude } }))}>
        Set home to current location</button>
      <button onClick={() => Notification.requestPermission()}>Enable notifications</button>
    </div>
  );
}
```

- [ ] **Step 7: `src/ui/AlertsManager.tsx`** — list/create/delete alert rules.

```tsx
import { useEffect, useState } from 'react';
import { listRules, saveRule, deleteRule } from '../alerts/alertStore';
import type { AlertRule } from '../types';

function newId(): string {
  return `r${Date.now().toString(36)}${Math.floor(performance.now()).toString(36)}`;
}

export default function AlertsManager() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [emergency, setEmergency] = useState(false);
  const refresh = () => listRules().then(setRules);
  useEffect(() => { refresh(); }, []);
  const add = async () => {
    if (!name) return;
    await saveRule({ id: newId(), name, enabled: true,
      criteria: { ...(type ? { type } : {}), ...(emergency ? { emergency: true } : {}) } });
    setName(''); setType(''); setEmergency(false); refresh();
  };
  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
        <input placeholder="Alert name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Type (e.g. B744)" value={type} onChange={(e) => setType(e.target.value)} />
        <label><input type="checkbox" checked={emergency}
          onChange={(e) => setEmergency(e.target.checked)} /> Emergency squawks</label>
        <button onClick={add}>Add alert</button>
      </div>
      {rules.map((r) => (
        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
          <span>{r.name} <small style={{ color: '#6b7280' }}>{JSON.stringify(r.criteria)}</small></span>
          <button onClick={() => deleteRule(r.id).then(refresh)}>✕</button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 8: `src/ui/StatsDashboard.tsx`** — session summary from IndexedDB.

```tsx
import { useEffect, useState } from 'react';
import { getSummary, clearStats } from '../stats/statsStore';
import type { StatsSummary } from '../stats/aggregate';

export default function StatsDashboard() {
  const [sum, setSum] = useState<StatsSummary | null>(null);
  const refresh = () => getSummary().then(setSum);
  useEffect(() => { refresh(); const t = setInterval(refresh, 10000); return () => clearInterval(t); }, []);
  if (!sum) return <div style={{ padding: 12 }}>No data yet.</div>;
  return (
    <div style={{ padding: 12 }}>
      <p><strong>{sum.totalUnique}</strong> unique aircraft seen this session.</p>
      <h4>Most common types</h4>
      <ol>{sum.byType.slice(0, 8).map((t) => <li key={t.type}>{t.type} — {t.count}</li>)}</ol>
      <h4>Rarest (seen once)</h4>
      <ul>{sum.rarest.filter((t) => t.count === 1).slice(0, 8).map((t) => <li key={t.type}>{t.type}</li>)}</ul>
      <button onClick={() => clearStats().then(refresh)}>Reset stats</button>
    </div>
  );
}
```

- [ ] **Step 9: `src/ui/ChatPanel.tsx`** — wires the store/map/enrich/alerts/stats into `ToolActions` and runs the `Assistant`.

```tsx
import { useMemo, useRef, useState } from 'react';
import { useStore, visibleAircraft } from '../store/useStore';
import { Assistant, type ChatTurn } from '../ai/assistant';
import type { ToolActions } from '../ai/tools';
import { getRoute, getAircraftInfo } from '../enrich/adsbdb';
import { saveRule, listRules, deleteRule } from '../alerts/alertStore';
import { getSummary } from '../stats/statsStore';
import type { AlertCriteria } from '../types';

function newId(): string {
  return `r${Date.now().toString(36)}${Math.floor(performance.now()).toString(36)}`;
}

export default function ChatPanel({ flyTo }: { flyTo: (lat: number, lon: number, zoom: number) => void }) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
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
      const route = live?.callsign ? await getRoute(live.callsign) : null;
      const info = await getAircraftInfo(live?.registration ?? idOrReg);
      return { live, route, info };
    },
    getRoute: (callsign) => getRoute(callsign),
    createAlert: async (name, criteria: AlertCriteria) => {
      const id = newId();
      await saveRule({ id, name, enabled: true, criteria });
      return id;
    },
    listAlerts: async () => (await listRules()).map((r) => ({ id: r.id, name: r.name })),
    deleteAlert: (id) => deleteRule(id),
    queryStats: () => getSummary(),
  }), [flyTo]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || busy) return;
    if (!settings.geminiApiKey) {
      setTurns((t) => [...t, { role: 'model', text: 'Add a Gemini API key in Settings to use the assistant.' }]);
      return;
    }
    setInput('');
    setTurns((t) => [...t, { role: 'user', text: msg }]);
    setBusy(true);
    try {
      const assistant = new Assistant(settings.geminiApiKey, settings.geminiModel, actions);
      const reply = await assistant.send(turns, msg);
      setTurns((t) => [...t, { role: 'model', text: reply }]);
    } catch (err) {
      setTurns((t) => [...t, { role: 'model', text: `Error: ${(err as Error).message}` }]);
    } finally {
      setBusy(false);
      setTimeout(() => endRef.current?.scrollIntoView(), 0);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {turns.map((t, i) => (
          <div key={i} style={{ margin: '6px 0', textAlign: t.role === 'user' ? 'right' : 'left' }}>
            <span style={{ display: 'inline-block', padding: '6px 10px', borderRadius: 8,
              background: t.role === 'user' ? '#1d4ed8' : '#e5e7eb',
              color: t.role === 'user' ? '#fff' : '#111' }}>{t.text}</span>
          </div>
        ))}
        {busy && <div style={{ color: '#6b7280' }}>…thinking</div>}
        <div ref={endRef} />
      </div>
      <div style={{ display: 'flex', gap: 6, padding: 8, borderTop: '1px solid #e5e7eb' }}>
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Ask about the skies…"
          style={{ flex: 1, padding: 8 }} />
        <button onClick={send} disabled={busy}>Send</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 10: Assemble `src/App.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
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
        onAircraft: (list) => { useStore.getState().setAircraft(list); useStore.getState().setStale(false); },
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
```

- [ ] **Step 11: Expose a `flyTo` API from `MapView`**

Modify `src/map/MapView.tsx`: change the component signature to
`export default function MapView({ onReady }: { onReady: (api: { flyTo: (lat: number, lon: number, zoom: number) => void }) => void })`
and inside the first `useEffect`, after `mapRef.current = map;`, add:
```ts
onReady({ flyTo: (lat, lon, zoom) => map.flyTo({ center: [lon, lat], zoom }) });
```

- [ ] **Step 12: Full test run + manual end-to-end check**

Run: `npm test -- --run`
Expected: PASS (all suites).

Then `npm run dev` and verify in the browser:
1. Map shows live aircraft near London that move smoothly and rotate.
2. Clicking a plane (or list row) shows details; route/photo appear when available.
3. Filters (Military/Emergency/Airborne/type/airline) reduce the list and map.
4. Search jumps to a callsign.
5. Stats tab shows growing unique-aircraft counts after a minute.
6. Alerts tab: add an "Emergency squawks" alert; confirm it persists on reload.
7. Settings: paste a Gemini key, enable notifications.
8. Chat tab: "show me military aircraft", "what's the rarest plane I've seen?", "alert me when a B744 is overhead" — confirm the map/filter/alert actually change.

---

## Task 14: Emergency highlight polish + "too many aircraft" guard

**Files:**
- Modify: `src/map/MapView.tsx`, `src/App.tsx`

- [ ] **Step 1: Add a zoom-out guard**

In `MapView.tsx` render loop, before building features, if `map.getZoom() < 5` set the source to an empty collection and dispatch a `flr-toast` "Zoom in to see aircraft" at most once per 10s (track with a `useRef` timestamp). This avoids rendering thousands of icons at world view.

```ts
// inside render(), after getting `state`:
if (map.getZoom() < 5) {
  (map.getSource(SRC) as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features: [] });
  raf = requestAnimationFrame(render);
  return;
}
```

- [ ] **Step 2: Pulse emergency aircraft**

In the `aircraft-layer` paint, add a second circle layer beneath the symbol for emergencies. After `addLayer('aircraft-layer'...)` add:
```ts
map.addLayer({
  id: 'emergency-halo', type: 'circle', source: SRC,
  filter: ['get', 'emergency'],
  paint: { 'circle-radius': 16, 'circle-color': '#dc2626', 'circle-opacity': 0.3 },
}, 'aircraft-layer');
```

- [ ] **Step 3: Manual verify**

Run `npm run dev`; zoom out past z5 and confirm aircraft disappear with a toast; confirm any 7700 aircraft (if present) shows a red halo. (If none are live, temporarily force one aircraft's `emergency` true in the store via console to verify the halo.)

---

## Task 15: README + build verification

**Files:**
- Create: `README.md`
- Modify: `package.json` (add `build`/`preview` already present from Vite)

- [ ] **Step 1: Write `README.md`**

Include: what it is; data sources (airplanes.live, adsbdb, OpenFreeMap) and that they're free/keyless; how to run (`npm install`, `npm run dev`); how to add a Gemini key in Settings; **security note**: the Gemini key lives in the browser — restrict it in Google AI Studio / Google Cloud Console by HTTP referrer to your deployed origin, and treat it as low-privilege; the path to hide it (Approach B serverless) is future work. Document `npm run build` → `dist/`.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build succeeds, `dist/` produced, no TypeScript errors.

Run: `npm run preview` and confirm the built app loads and shows aircraft.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. Fix any that appear.

---

## Task 16: Git init + deploy (REQUIRES account confirmation)

> **STOP:** Before running anything here, confirm with the user that the active GitHub account is the intended one (`gh auth status` → expect **GhostPixel404**). Do not proceed otherwise.

- [ ] **Step 1: Confirm identity**

Run: `gh auth status`
Expected active account: **GhostPixel404**. If not, switch with `gh auth switch` and stop to confirm with the user.

- [ ] **Step 2: Set repo-local git identity**

```bash
git init
git config user.name "GhostPixel404"
git config user.email "<the GhostPixel404 account email — ask the user>"
```

- [ ] **Step 3: Verify `.gitignore` excludes secrets and build output**

Ensure `.gitignore` contains `node_modules`, `dist`, `.env*`, `.DS_Store`. (No API keys are in the repo — Gemini key is entered at runtime and stored in localStorage.)

- [ ] **Step 4: Initial commit**

```bash
git add -A
git commit -m "feat: flight radar with AI assistant (v1)

Live ADS-B tracking via airplanes.live, MapLibre map, adsbdb enrichment,
IndexedDB stats/alerts, and a Gemini function-calling assistant.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 5: Create the GitHub repo and push**

```bash
gh repo create flightradar-ai --public --source=. --remote=origin --push
```

- [ ] **Step 6: Deploy**

Choose one and confirm with the user first:
- **Vercel:** `npx vercel --prod` (framework auto-detected as Vite; output `dist`).
- **GitHub Pages:** add a Pages workflow that runs `npm ci && npm run build` and publishes `dist`; set `base` is already `'./'` in `vite.config.ts`. Enable Pages → GitHub Actions in repo settings.

Expected: a live URL serving the app. Add the deployed origin to the Gemini key's HTTP-referrer restriction.

---

## Self-Review notes (addressed)

- **Spec coverage:** live map (T3,T9,T10), smooth movement (T5,T9), click details + enrichment (T8,T13), filters + search (T4,T13), follow (T9,T13), emergency highlight (T9,T14), AI all-four-roles (T11,T12,T13), alerts + notifications (T7,T13), stats dashboard (T6,T13), settings incl. key/units/refresh/home (T13), error handling/stale + rate-limit-friendly interval (T10,T13), persistence (T6,T7,T8 via IndexedDB), deploy + key-safety docs (T15,T16). All spec sections map to tasks.
- **Type consistency:** `Aircraft`, `Filters`, `AlertRule`, `AlertCriteria`, `Sighting`, `Settings`, `StatsSummary`, `RouteInfo`, `AircraftInfo`, `ToolActions` defined once and reused; `matchesFilters`/`isEmergency`/`matchCriteria`/`findMatches`/`toGeoJSON`/`dispatchTool`/`deadReckon`/`runOnce`/`startPolling` names are consistent across tasks.
- **No placeholders:** every code step contains full code; the only deliberately textual steps are manual browser checks and the README outline (content enumerated).
```
