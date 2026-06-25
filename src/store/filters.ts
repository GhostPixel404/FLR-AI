import { EMERGENCY_SQUAWKS, type Aircraft, type Filters } from '../types';

export function isEmergency(a: Aircraft): boolean {
  if (a.squawk && (EMERGENCY_SQUAWKS as readonly string[]).includes(a.squawk)) return true;
  return a.emergency != null && a.emergency !== 'none' && a.emergency !== '';
}

export function matchesFilters(a: Aircraft, f: Filters): boolean {
  if (f.altitudeMin != null && (a.altitude ?? -Infinity) < f.altitudeMin) return false;
  if (f.altitudeMax != null && (a.altitude ?? Infinity) > f.altitudeMax) return false;
  if (f.type && !(a.type ?? '').toLowerCase().includes(f.type.toLowerCase())) return false;
  if (f.airline && !(a.callsign ?? '').toLowerCase().startsWith(f.airline.toLowerCase())) return false;
  if (f.military && !a.military) return false;
  if (f.emergency && !isEmergency(a)) return false;
  if (f.onGround !== null && a.onGround !== f.onGround) return false;
  return true;
}
