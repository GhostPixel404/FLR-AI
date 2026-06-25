// Vercel serverless function: returns small WORLDWIDE aggregates from OpenSky.
// Runs server-side, so it isn't blocked by OpenSky's restrictive CORS. The
// browser fetches /api/global (same origin) and feeds the numbers to the AI.

export const config = { maxDuration: 30 };

let cache = null; // { data, ts } — survives on a warm instance

export default async function handler(_req, res) {
  // Let Vercel's CDN cache the response so OpenSky is hit at most ~once/45s.
  res.setHeader('Cache-Control', 's-maxage=45, stale-while-revalidate=120');

  if (cache && Date.now() - cache.ts < 45_000) {
    return res.status(200).json(cache.data);
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    let r;
    try {
      r = await fetch('https://opensky-network.org/api/states/all', {
        headers: { 'User-Agent': 'FLR-AI/1.0 (+https://flr-ai.vercel.app)', Accept: 'application/json' },
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!r.ok) return res.status(502).json({ error: `OpenSky HTTP ${r.status}` });
    const j = await r.json();
    const states = Array.isArray(j.states) ? j.states : [];

    let airborne = 0;
    let onGround = 0;
    const byCountry = new Map();
    for (const s of states) {
      // OpenSky state vector: [2]=origin_country, [8]=on_ground
      const country = s[2] || 'Unknown';
      if (s[8] === true) onGround++; else airborne++;
      byCountry.set(country, (byCountry.get(country) || 0) + 1);
    }
    const top = [...byCountry.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([country, count]) => ({ country, count }));

    const data = {
      time: j.time ?? Math.floor(Date.now() / 1000),
      total: states.length,
      airborne,
      onGround,
      byCountry: top,
    };
    cache = { data, ts: Date.now() };
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: String(e), cause: String(e?.cause ?? '') });
  }
}
