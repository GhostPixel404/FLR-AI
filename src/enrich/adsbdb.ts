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
