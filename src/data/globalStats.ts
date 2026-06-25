export interface GlobalStats {
  time: number;
  total: number;
  airborne: number;
  onGround: number;
  byCountry: { country: string; count: number }[];
}

let cache: { data: GlobalStats; ts: number } | null = null;

/**
 * Fetch worldwide aggregates from our serverless proxy (/api/global). Cached for
 * 60s on the client. Returns null if unavailable (e.g. local dev without the
 * function, or the proxy/OpenSky being down) — callers degrade gracefully.
 */
export async function getGlobalStats(): Promise<GlobalStats | null> {
  if (cache && Date.now() - cache.ts < 60_000) return cache.data;
  try {
    const res = await fetch('/api/global');
    if (!res.ok) return null;
    const data = (await res.json()) as GlobalStats;
    if (typeof data.total !== 'number') return null;
    cache = { data, ts: Date.now() };
    return data;
  } catch {
    return null;
  }
}

/** One-line summary for the AI context. */
export function summarizeGlobal(g: GlobalStats): string {
  const top = g.byCountry.slice(0, 12).map((c) => `${c.country} ${c.count}`).join(', ');
  return `Worldwide right now (OpenSky, all tracked aircraft): ~${g.total} total, ${g.airborne} airborne, ${g.onGround} on the ground. `
    + `Busiest by country of registration: ${top}. `
    + `(Counts are global aggregates; no per-aircraft type is available worldwide.)`;
}
