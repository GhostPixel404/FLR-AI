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
