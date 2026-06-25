import type { Aircraft, AlertCriteria, AlertRule } from '../types';
import { isEmergency } from '../store/filters';
import { haversineKm } from '../util/geo';

export function matchCriteria(
  a: Aircraft, c: AlertCriteria, home: { lat: number; lon: number } | null,
): boolean {
  if (c.type && (a.type ?? '').toUpperCase() !== c.type.toUpperCase()) return false;
  if (c.airlinePrefix && !(a.callsign ?? '').toUpperCase().startsWith(c.airlinePrefix.toUpperCase())) return false;
  if (c.military && !a.military) return false;
  if (c.emergency && !isEmergency(a)) return false;
  if (c.belowAltitude != null && (a.altitude ?? Infinity) >= c.belowAltitude) return false;
  if (c.registration && (a.registration ?? '').toUpperCase() !== c.registration.toUpperCase()) return false;
  if (c.callsign && (a.callsign ?? '').toUpperCase() !== c.callsign.toUpperCase()) return false;
  if (c.withinKm != null) {
    if (!home) return false;
    if (haversineKm(home.lat, home.lon, a.lat, a.lon) > c.withinKm) return false;
  }
  return true;
}

export interface AlertHit { rule: AlertRule; aircraft: Aircraft }

export function findMatches(
  list: Aircraft[], rules: AlertRule[], home: { lat: number; lon: number } | null,
): AlertHit[] {
  const hits: AlertHit[] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    for (const a of list) {
      if (matchCriteria(a, rule.criteria, home)) hits.push({ rule, aircraft: a });
    }
  }
  return hits;
}
