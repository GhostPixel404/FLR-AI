import { describe, it, expect } from 'vitest';
import { haversineKm, boundsRadiusNm } from './geo';

describe('geo', () => {
  it('computes haversine distance (LHR→CDG ~ 348km)', () => {
    const d = haversineKm(51.47, -0.45, 49.01, 2.55);
    expect(d).toBeGreaterThan(330);
    expect(d).toBeLessThan(360);
  });
  it('derives a query radius (nm) from map bounds, capped at 250', () => {
    const r = boundsRadiusNm({ north: 52, south: 51, east: 0, west: -1 });
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThanOrEqual(250);
  });
});
