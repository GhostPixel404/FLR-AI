import { describe, it, expect } from 'vitest';
import { feetToMeters, knotsToKmh, formatAltitude } from './units';

describe('units', () => {
  it('converts feet to meters', () => {
    expect(Math.round(feetToMeters(1000))).toBe(305);
  });
  it('converts knots to km/h', () => {
    expect(Math.round(knotsToKmh(100))).toBe(185);
  });
  it('formats altitude metric vs imperial', () => {
    expect(formatAltitude(10000, 'imperial')).toBe('10,000 ft');
    expect(formatAltitude(10000, 'metric')).toBe('3,048 m');
    expect(formatAltitude(null, 'imperial')).toBe('—');
  });
});
