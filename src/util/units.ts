export type UnitSystem = 'metric' | 'imperial';

export const feetToMeters = (ft: number): number => ft * 0.3048;
export const knotsToKmh = (kt: number): number => kt * 1.852;

const withCommas = (n: number): string => n.toLocaleString('en-US');

export function formatAltitude(ft: number | null, units: UnitSystem): string {
  if (ft === null || Number.isNaN(ft)) return '—';
  return units === 'metric'
    ? `${withCommas(Math.round(feetToMeters(ft)))} m`
    : `${withCommas(Math.round(ft))} ft`;
}

export function formatSpeed(kt: number | null, units: UnitSystem): string {
  if (kt === null || Number.isNaN(kt)) return '—';
  return units === 'metric'
    ? `${Math.round(knotsToKmh(kt))} km/h`
    : `${Math.round(kt)} kt`;
}
