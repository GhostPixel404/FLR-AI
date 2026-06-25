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
