import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseRoute, parseAircraftInfo } from './adsbdb';

afterEach(() => vi.restoreAllMocks());

const ROUTE = { response: { flightroute: {
  callsign: 'BAW46EZ',
  airline: { name: 'British Airways', icao: 'BAW', iata: 'BA' },
  origin: { iata_code: 'LHR', icao_code: 'EGLL', name: 'London Heathrow', municipality: 'London' },
  destination: { iata_code: 'MAD', icao_code: 'LEMD', name: 'Madrid Barajas', municipality: 'Madrid' },
} } };

const AIRCRAFT = { response: { aircraft: {
  type: '777 236ER', icao_type: 'B772', manufacturer: 'Boeing',
  registration: 'G-YMML', registered_owner: 'British Airways',
  url_photo_thumbnail: 'https://x/thumb.jpg',
} } };

describe('parseRoute', () => {
  it('extracts origin, destination, airline', () => {
    const r = parseRoute(ROUTE)!;
    expect(r.airline).toBe('British Airways');
    expect(r.originIata).toBe('LHR');
    expect(r.destinationIata).toBe('MAD');
  });
  it('returns null for an unknown-callsign response', () => {
    expect(parseRoute({ response: 'unknown callsign' })).toBeNull();
  });
});

describe('parseAircraftInfo', () => {
  it('extracts owner, type, photo', () => {
    const a = parseAircraftInfo(AIRCRAFT)!;
    expect(a.owner).toBe('British Airways');
    expect(a.icaoType).toBe('B772');
    expect(a.photoThumb).toContain('thumb.jpg');
  });
});
