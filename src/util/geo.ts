export interface Bounds { north: number; south: number; east: number; west: number }

const R_KM = 6371;
const toRad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.sqrt(a));
}

export function boundsCenter(b: Bounds): { lat: number; lon: number } {
  return { lat: (b.north + b.south) / 2, lon: (b.east + b.west) / 2 };
}

/** Radius in nautical miles from center to the farthest corner, capped at 250 (feed limit). */
export function boundsRadiusNm(b: Bounds): number {
  const c = boundsCenter(b);
  const km = haversineKm(c.lat, c.lon, b.north, b.east);
  const nm = km / 1.852;
  return Math.min(250, Math.max(1, Math.ceil(nm)));
}
