import { describe, it, expect } from 'vitest';
import { haversineKm, boundsRadiusNm, tileQueries } from './geo';

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

  describe('tileQueries', () => {
    it('uses a single query for a small (city-sized) view', () => {
      const tiles = tileQueries({ north: 52, south: 51, east: 0, west: -1 });
      expect(tiles).toHaveLength(1);
      expect(tiles[0].radiusNm).toBeLessThanOrEqual(250);
    });
    it('tiles a large (continental) view with multiple ≤250nm circles', () => {
      const tiles = tileQueries({ north: 60, south: 40, east: 30, west: -10 });
      expect(tiles.length).toBeGreaterThan(1);
      for (const t of tiles) expect(t.radiusNm).toBeLessThanOrEqual(250);
    });
    it('caps the number of tiles for an extreme view', () => {
      const tiles = tileQueries({ north: 80, south: -80, east: 170, west: -170 }, 9);
      expect(tiles.length).toBeLessThanOrEqual(9);
    });
  });
});
