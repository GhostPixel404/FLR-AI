import { describe, it, expect, beforeEach } from 'vitest';
import { recordPositions, getTrailLine } from './trails';
import type { Aircraft } from '../types';

function makeAircraft(hex: string, lat: number, lon: number): Aircraft {
  return {
    hex, callsign: null, registration: null, type: null, description: null,
    lat, lon, altitude: null, onGround: false, groundSpeed: null, track: null,
    verticalRate: null, squawk: null, emergency: null, category: null,
    military: false, distanceNm: null, seen: 0, lastUpdate: Date.now(),
  };
}

// Reset module-level state between tests by re-importing (vitest isolates modules per file)
// We work around the shared module state by using a fresh hex per test.
describe('trails', () => {
  it('getTrailLine(null) yields 0 features', () => {
    const fc = getTrailLine(null);
    expect(fc.features).toHaveLength(0);
  });

  it('after two different positions, getTrailLine yields one LineString with 2 coords', () => {
    const hex = 'trail-test-1';
    recordPositions([makeAircraft(hex, 51.0, -0.1)]);
    recordPositions([makeAircraft(hex, 51.1, -0.2)]);
    const fc = getTrailLine(hex);
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].geometry.type).toBe('LineString');
    expect(fc.features[0].geometry.coordinates).toHaveLength(2);
  });

  it('repeated identical positions do not duplicate points', () => {
    const hex = 'trail-test-2';
    recordPositions([makeAircraft(hex, 51.0, -0.1)]);
    recordPositions([makeAircraft(hex, 51.0, -0.1)]);
    recordPositions([makeAircraft(hex, 51.0, -0.1)]);
    // only 1 point — not enough for a LineString
    const fc = getTrailLine(hex);
    expect(fc.features).toHaveLength(0);
  });

  it('unknown hex yields 0 features', () => {
    const fc = getTrailLine('nonexistent-hex-xyz');
    expect(fc.features).toHaveLength(0);
  });
});
