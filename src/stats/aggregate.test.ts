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
