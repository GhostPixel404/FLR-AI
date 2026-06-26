export interface GlobalStats {
  /** Military aircraft tracked worldwide right now. */
  military: number;
}

let cache: { data: GlobalStats; ts: number } | null = null;

/**
 * Worldwide signals that are actually reachable from the browser. A true global
 * total isn't available for free (OpenSky CORS-blocks browsers and IP-blocks
 * cloud functions; the ADS-B aggregators expose viewport + filtered feeds only),
 * but airplanes.live's global MILITARY feed is CORS-open. Returns null on failure
 * so callers degrade gracefully.
 */
export async function getGlobalStats(): Promise<GlobalStats | null> {
  if (cache && Date.now() - cache.ts < 60_000) return cache.data;
  try {
    const res = await fetch('https://api.airplanes.live/v2/mil');
    if (!res.ok) return null;
    const data = (await res.json()) as { ac?: unknown[] };
    const stats: GlobalStats = { military: Array.isArray(data.ac) ? data.ac.length : 0 };
    cache = { data: stats, ts: Date.now() };
    return stats;
  } catch {
    return null;
  }
}

/** One-line worldwide summary for the AI context. */
export function summarizeGlobal(g: GlobalStats): string {
  return `Worldwide note: ${g.military} military aircraft are being tracked globally right now. `
    + `(A worldwide TOTAL of all flights is not available to this app — only military is queryable globally. `
    + `For totals/types, use the on-screen snapshot above, which covers the user's whole current map view.)`;
}
