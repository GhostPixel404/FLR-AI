import { describe, it, expect, vi } from 'vitest';
import { runOnce } from './pollLoop';
import type { Aircraft } from '../types';
import type { FlightProvider } from '../data/provider';

const sample: Aircraft[] = [{
  hex: 'a', callsign: 'BAW1', registration: null, type: 'A320', description: null,
  lat: 51, lon: 0, altitude: 10000, onGround: false, groundSpeed: 300, track: 0,
  verticalRate: 0, squawk: '1000', emergency: 'none', category: null,
  military: false, distanceNm: null, seen: 0, lastUpdate: 0,
}];

describe('runOnce', () => {
  it('fetches, then calls each sink with the result', async () => {
    const provider: FlightProvider = { poll: vi.fn().mockResolvedValue(sample) };
    const onAircraft = vi.fn();
    const onStats = vi.fn().mockResolvedValue(undefined);
    const onAlerts = vi.fn().mockResolvedValue(undefined);
    await runOnce(provider, { north: 52, south: 51, east: 1, west: -1 },
      { onAircraft, onStats, onAlerts, home: null });
    expect(onAircraft).toHaveBeenCalledWith(sample);
    expect(onStats).toHaveBeenCalledWith(sample, expect.any(Number));
    expect(onAlerts).toHaveBeenCalledWith(sample, null);
  });
  it('reports an error via onError and does not throw', async () => {
    const provider: FlightProvider = { poll: vi.fn().mockRejectedValue(new Error('boom')) };
    const onError = vi.fn();
    await runOnce(provider, { north: 52, south: 51, east: 1, west: -1 },
      { onAircraft: vi.fn(), onStats: vi.fn(), onAlerts: vi.fn(), home: null, onError });
    expect(onError).toHaveBeenCalled();
  });
});
