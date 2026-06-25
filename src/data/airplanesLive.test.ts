import { describe, it, expect, vi, afterEach } from 'vitest';
import { normalizeAircraft, AirplanesLiveProvider } from './airplanesLive';

const RAW = {
  ac: [
    { hex: '402f72', r: 'G-BTIM', t: 'P28A', desc: 'PIPER PA-28',
      alt_baro: 'ground', gs: 0, lat: 51.5, lon: -0.76, squawk: '7000',
      seen: 23.3, dst: 11.9 },
    { hex: '39e690', flight: 'AFR38XY ', r: 'F-HZUQ', t: 'BCS3',
      desc: 'AIRBUS A220-300', alt_baro: 4500, gs: 209.7, track: 287.48,
      baro_rate: -992, squawk: '5622', emergency: 'none', category: 'A3',
      lat: 51.4, lon: -0.4, dbFlags: 0, seen: 1.1, dst: 5.0 },
    { hex: 'aef123', flight: 'RCH123 ', t: 'C17', alt_baro: 33000, gs: 450,
      track: 90, lat: 51.2, lon: -0.2, squawk: '7700', dbFlags: 1, seen: 0.5, dst: 8 },
  ],
};

afterEach(() => vi.restoreAllMocks());

describe('normalizeAircraft', () => {
  it('marks ground aircraft and nulls altitude', () => {
    const a = normalizeAircraft(RAW.ac[0], 1000);
    expect(a.onGround).toBe(true);
    expect(a.altitude).toBeNull();
    expect(a.registration).toBe('G-BTIM');
    expect(a.callsign).toBeNull();
  });
  it('trims callsign and keeps numeric altitude', () => {
    const a = normalizeAircraft(RAW.ac[1], 1000);
    expect(a.callsign).toBe('AFR38XY');
    expect(a.altitude).toBe(4500);
    expect(a.verticalRate).toBe(-992);
    expect(a.onGround).toBe(false);
  });
  it('flags military from dbFlags bit 1', () => {
    const a = normalizeAircraft(RAW.ac[2], 1000);
    expect(a.military).toBe(true);
  });
  it('treats placeholder "@@@@@@" callsigns as unknown', () => {
    const a = normalizeAircraft({ hex: 'x', flight: '@@@@@@  ', lat: 1, lon: 1 }, 1000);
    expect(a.callsign).toBeNull();
  });
});

describe('AirplanesLiveProvider', () => {
  it('builds the point URL from bounds and parses results', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, json: async () => RAW,
    } as Response);
    vi.stubGlobal('fetch', fetchMock);
    const provider = new AirplanesLiveProvider();
    const out = await provider.poll({ north: 52, south: 51, east: 0, west: -1 });
    expect(fetchMock).toHaveBeenCalledOnce();
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toMatch(/api\.airplanes\.live\/v2\/point\//);
    expect(out).toHaveLength(3);
    expect(out[0].hex).toBe('402f72');
  });
  it('throws on HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 } as Response));
    await expect(new AirplanesLiveProvider().poll(
      { north: 52, south: 51, east: 0, west: -1 })).rejects.toThrow(/429/);
  });
});
