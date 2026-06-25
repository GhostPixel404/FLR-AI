import type { Aircraft } from '../types';

const KT_TO_KM_PER_S = 1.852 / 3600;
const KM_PER_DEG_LAT = 111.32;

/** Estimate a position `seconds` after the last update using speed + track. */
export function deadReckon(a: Aircraft, seconds: number): { lat: number; lon: number } {
  if (!a.groundSpeed || a.track == null || a.onGround) return { lat: a.lat, lon: a.lon };
  const distKm = a.groundSpeed * KT_TO_KM_PER_S * seconds;
  const rad = (a.track * Math.PI) / 180;
  const dLat = (distKm * Math.cos(rad)) / KM_PER_DEG_LAT;
  const kmPerDegLon = KM_PER_DEG_LAT * Math.cos((a.lat * Math.PI) / 180);
  const dLon = kmPerDegLon === 0 ? 0 : (distKm * Math.sin(rad)) / kmPerDegLon;
  return { lat: a.lat + dLat, lon: a.lon + dLon };
}
