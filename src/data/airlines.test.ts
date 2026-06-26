import { describe, it, expect } from 'vitest';
import { airlineFromCallsign } from './airlines';

describe('airlineFromCallsign', () => {
  it('maps a known ICAO callsign prefix to the airline name', () => {
    expect(airlineFromCallsign('UAE123')).toBe('Emirates');
    expect(airlineFromCallsign('baw46ez')).toBe('British Airways');
    expect(airlineFromCallsign('QTR8')).toBe('Qatar Airways');
  });
  it('returns null for unknown or empty callsigns', () => {
    expect(airlineFromCallsign('ZZZ9')).toBeNull();
    expect(airlineFromCallsign(null)).toBeNull();
    expect(airlineFromCallsign('')).toBeNull();
  });
});
