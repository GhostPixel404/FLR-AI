import { describe, it, expect } from 'vitest';
import { buildSnapshot } from './snapshot';
import type { Aircraft } from '../types';

function ac(p: Partial<Aircraft>): Aircraft {
  return { hex: 'h', callsign: null, registration: null, type: null, description: null,
    lat: 0, lon: 0, altitude: 10000, onGround: false, groundSpeed: 300, track: 0,
    verticalRate: 0, squawk: null, emergency: 'none', category: null, military: false,
    distanceNm: 10, seen: 0, lastUpdate: 0, ...p };
}

describe('buildSnapshot', () => {
  it('reports an empty map clearly', () => {
    const s = buildSnapshot([]);
    expect(s).toMatch(/NO aircraft/i);
  });

  it('summarises counts, types, flags and lists nearest-first', () => {
    const s = buildSnapshot([
      ac({ hex: 'a', callsign: 'BAW1', type: 'A320', distanceNm: 30 }),
      ac({ hex: 'b', callsign: 'AFR2', type: 'A320', distanceNm: 5, military: true }),
      ac({ hex: 'c', callsign: 'RCH3', type: 'C17', distanceNm: 12, squawk: '7700' }),
    ]);
    expect(s).toMatch(/3 aircraft are currently on the user's map/);
    expect(s).toMatch(/1 military/);
    expect(s).toMatch(/1 emergency/);
    expect(s).toMatch(/A320×2/);
    // nearest-first: AFR2 (5nm) appears before BAW1 (30nm)
    expect(s.indexOf('AFR2')).toBeLessThan(s.indexOf('BAW1'));
  });

  it('caps the listed aircraft at 25', () => {
    const many = Array.from({ length: 40 }, (_, i) => ac({ hex: `h${i}`, callsign: `CS${i}`, distanceNm: i }));
    const s = buildSnapshot(many);
    expect(s).toMatch(/40 aircraft are currently/);
    expect((s.match(/\bCS\d+\b/g) ?? []).length).toBe(25);
  });
});
