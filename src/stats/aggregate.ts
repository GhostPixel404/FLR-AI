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
