import { describe, it, expect } from 'vitest';
import { toGeoJSON } from './aircraftLayer';
import type { Aircraft } from '../types';

function ac(p: Partial<Aircraft>): Aircraft {
  return { hex: 'h', callsign: 'BAW1', registration: null, type: 'A320',
    description: null, lat: 51, lon: 0, altitude: 10000, onGround: false,
    groundSpeed: 300, track: 90, verticalRate: 0, squawk: '1000',
    emergency: 'none', category: 'A3', military: false, distanceNm: null,
    seen: 0, lastUpdate: 0, ...p };
}

describe('toGeoJSON', () => {
  it('emits a Point feature per aircraft with rotation + emergency props', () => {
    const fc = toGeoJSON([ac({ hex: 'a' }), ac({ hex: 'b', squawk: '7700' })], null);
    expect(fc.features).toHaveLength(2);
    expect(fc.features[0].geometry.coordinates).toEqual([0, 51]);
    expect(fc.features[0].properties.rotation).toBe(90);
    expect(fc.features[1].properties.emergency).toBe(true);
  });
  it('flags the selected aircraft', () => {
    const fc = toGeoJSON([ac({ hex: 'a' })], 'a');
    expect(fc.features[0].properties.selected).toBe(true);
  });
});
