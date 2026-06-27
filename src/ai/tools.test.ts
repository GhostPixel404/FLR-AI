import { describe, it, expect, vi } from 'vitest';
import { dispatchTool, toolDeclarations, type ToolActions } from './tools';
import type { Aircraft } from '../types';

function ac(p: Partial<Aircraft>): Aircraft {
  return { hex: 'a', callsign: 'BAW1', registration: 'G-AB', type: 'A320',
    description: null, lat: 51, lon: 0, altitude: 10000, onGround: false,
    groundSpeed: 300, track: 0, verticalRate: 0, squawk: '1000',
    emergency: 'none', category: null, military: false, distanceNm: null,
    seen: 0, lastUpdate: 0, ...p };
}

function actions(): ToolActions {
  return {
    setMapView: vi.fn(),
    setFilter: vi.fn(),
    clearFilters: vi.fn(),
    trackAircraft: vi.fn().mockReturnValue(true),
    untrack: vi.fn(),
    getVisibleAircraft: vi.fn().mockReturnValue([ac({ hex: 'a', type: 'A320' }), ac({ hex: 'b', type: 'B744', callsign: 'BAW2' })]),
    scanAround: vi.fn().mockResolvedValue([ac({ hex: 'lhr1', type: 'B772', callsign: 'BAW100', distanceNm: 3 })]),
    getAircraftDetails: vi.fn().mockResolvedValue({ live: ac({}), route: null, info: null }),
    getRoute: vi.fn().mockResolvedValue(null),
    createAlert: vi.fn().mockResolvedValue('id-1'),
    listAlerts: vi.fn().mockResolvedValue([]),
    deleteAlert: vi.fn().mockResolvedValue(undefined),
    queryStats: vi.fn().mockResolvedValue({ totalUnique: 2, byType: [], rarest: [] }),
  };
}

describe('toolDeclarations', () => {
  it('exposes the expected tool names', () => {
    const names = toolDeclarations.map((d) => d.name);
    expect(names).toContain('queryFlights');
    expect(names).toContain('createAlert');
    expect(names).toContain('setMapView');
    expect(names).toContain('queryStats');
  });
});

describe('dispatchTool', () => {
  it('queryFlights filters visible aircraft by type', async () => {
    const a = actions();
    const out = await dispatchTool('queryFlights', { type: 'B744' }, a);
    expect(out.count).toBe(1);
    expect(out.aircraft[0].hex).toBe('b');
  });
  it('setMapView calls the action and returns ok', async () => {
    const a = actions();
    const out = await dispatchTool('setMapView', { lat: 40, lon: -73, zoom: 8 }, a);
    expect(a.setMapView).toHaveBeenCalledWith(40, -73, 8);
    expect(out.ok).toBe(true);
  });
  it('createAlert returns the new id', async () => {
    const a = actions();
    const out = await dispatchTool('createAlert', { name: 'jumbos', type: 'B744' }, a);
    expect(out.id).toBe('id-1');
  });
  it('flyTo geocodes the place name and moves the map', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '35.68', lon: '139.76', display_name: 'Tokyo, Japan', addresstype: 'city', type: 'city', class: 'place' }],
    } as Response);
    vi.stubGlobal('fetch', fetchMock);
    const a = actions();
    const out = await dispatchTool('flyTo', { query: 'Tokyo' }, a);
    expect(a.setMapView).toHaveBeenCalledWith(35.68, 139.76, 10);
    expect(out.movedTo).toMatch(/Tokyo/);
    expect(a.scanAround).toHaveBeenCalledWith(35.68, 139.76);
    expect(out.aircraft[0].hex).toBe('lhr1'); // returns the destination's aircraft
    vi.unstubAllGlobals();
  });
  it('flyTo with `find` moves there and tracks the matching aircraft in one call', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '51.5', lon: '-0.1', display_name: 'London, UK', addresstype: 'city', type: 'city', class: 'place' }],
    } as Response));
    const a = actions(); // scanAround returns a B772 (hex 'lhr1')
    const out = await dispatchTool('flyTo', { query: 'London', find: '777' }, a);
    expect(a.setMapView).toHaveBeenCalled();
    expect(a.trackAircraft).toHaveBeenCalledWith('lhr1');
    expect(out.tracked.hex).toBe('lhr1');
    vi.unstubAllGlobals();
  });
  it('flyTo returns an error when the place is not found', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] } as Response));
    const out = await dispatchTool('flyTo', { query: 'asdfqwer' }, actions());
    expect(out.error).toMatch(/couldn't find/i);
    vi.unstubAllGlobals();
  });
  it('returns an error object for an unknown tool', async () => {
    const out = await dispatchTool('nope', {}, actions());
    expect(out.error).toMatch(/unknown tool/i);
  });
});
