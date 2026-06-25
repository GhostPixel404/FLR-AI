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

/** Clean a raw callsign. Feeds emit placeholders like "@@@@@@" when no valid
 *  callsign is available — treat those (and blanks) as unknown. */
function cleanCallsign(flight?: string): string | null {
  if (!flight) return null;
  const t = flight.trim();
  if (!t || /^@+$/.test(t)) return null;
  return t;
}

export function normalizeAircraft(raw: RawAircraft, now: number): Aircraft {
  const onGround = raw.alt_baro === 'ground';
  const altitude = typeof raw.alt_baro === 'number' ? raw.alt_baro : null;
  return {
    hex: raw.hex,
    callsign: cleanCallsign(raw.flight),
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
