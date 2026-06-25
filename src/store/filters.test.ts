import { describe, it, expect } from 'vitest';
import { matchesFilters } from './filters';
import { DEFAULT_FILTERS, type Aircraft } from '../types';

const base: Aircraft = {
  hex: 'x', callsign: 'BAW123', registration: 'G-AB', type: 'A320',
  description: null, lat: 51, lon: 0, altitude: 10000, onGround: false,
  groundSpeed: 300, track: 90, verticalRate: 0, squawk: '1234',
  emergency: 'none', category: 'A3', military: false, distanceNm: 5,
  seen: 1, lastUpdate: 0,
};

describe('matchesFilters', () => {
  it('passes everything with default filters', () => {
    expect(matchesFilters(base, DEFAULT_FILTERS)).toBe(true);
  });
  it('filters by altitude range', () => {
    expect(matchesFilters(base, { ...DEFAULT_FILTERS, altitudeMin: 20000 })).toBe(false);
    expect(matchesFilters(base, { ...DEFAULT_FILTERS, altitudeMax: 20000 })).toBe(true);
  });
  it('filters by type substring, case-insensitive', () => {
    expect(matchesFilters(base, { ...DEFAULT_FILTERS, type: 'a32' })).toBe(true);
    expect(matchesFilters(base, { ...DEFAULT_FILTERS, type: 'b77' })).toBe(false);
  });
  it('filters by airline callsign prefix', () => {
    expect(matchesFilters(base, { ...DEFAULT_FILTERS, airline: 'baw' })).toBe(true);
    expect(matchesFilters(base, { ...DEFAULT_FILTERS, airline: 'afr' })).toBe(false);
  });
  it('filters emergency by squawk', () => {
    expect(matchesFilters({ ...base, squawk: '7700' },
      { ...DEFAULT_FILTERS, emergency: true })).toBe(true);
    expect(matchesFilters(base, { ...DEFAULT_FILTERS, emergency: true })).toBe(false);
  });
  it('filters onGround tri-state', () => {
    expect(matchesFilters(base, { ...DEFAULT_FILTERS, onGround: true })).toBe(false);
    expect(matchesFilters({ ...base, onGround: true },
      { ...DEFAULT_FILTERS, onGround: true })).toBe(true);
  });
});
