import { describe, it, expect } from 'vitest';
import { matchesType } from './aircraftTypes';

describe('matchesType', () => {
  it('matches 777 variants from "777" / "b777" / "boeing 777"', () => {
    expect(matchesType('B77W', '777')).toBe(true);
    expect(matchesType('B772', '777')).toBe(true);
    expect(matchesType('B77W', 'b777')).toBe(true);
    expect(matchesType('B77W', 'boeing 777')).toBe(true);
  });
  it('matches Airbus families', () => {
    expect(matchesType('A20N', 'a320')).toBe(true);
    expect(matchesType('A388', 'a380')).toBe(true);
    expect(matchesType('A35K', 'a350')).toBe(true);
  });
  it('handles exact codes and substrings', () => {
    expect(matchesType('B738', 'B738')).toBe(true);
    expect(matchesType('A320', 'a32')).toBe(true);
  });
  it('rejects non-matches and null', () => {
    expect(matchesType('A320', '777')).toBe(false);
    expect(matchesType(null, '777')).toBe(false);
  });
});
