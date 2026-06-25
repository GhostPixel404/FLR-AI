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

export interface QueryTile { lat: number; lon: number; radiusNm: number }

const KM_PER_NM = 1.852;

/**
 * Cover the visible bounds with one or more circular feed queries (each ≤250 nm
 * radius, the feed's cap). Small views → a single query; larger views → a grid
 * of overlapping circles, capped at `maxTiles` so we stay polite (very wide
 * views fall back to partial coverage centred on the view).
 */
export function tileQueries(b: Bounds, maxTiles = 9): QueryTile[] {
  const c = boundsCenter(b);
  const widthNm = haversineKm(c.lat, b.west, c.lat, b.east) / KM_PER_NM;
  const heightNm = haversineKm(b.south, c.lon, b.north, c.lon) / KM_PER_NM;

  // Fits in a single 250 nm-radius circle? (a 354 nm square has a 500 nm diagonal)
  if (widthNm <= 354 && heightNm <= 354) {
    return [{ lat: c.lat, lon: c.lon, radiusNm: boundsRadiusNm(b) }];
  }

  const CELL = 354; // nm — a cell this wide is fully covered by a 250 nm circle
  let cols = Math.max(1, Math.ceil(widthNm / CELL));
  let rows = Math.max(1, Math.ceil(heightNm / CELL));
  while (cols * rows > maxTiles) {
    if (cols >= rows && cols > 1) cols--;
    else if (rows > 1) rows--;
    else break;
  }

  const cellWNm = widthNm / cols;
  const cellHNm = heightNm / rows;
  const radius = Math.min(250, Math.max(1, Math.ceil(Math.sqrt(cellWNm ** 2 + cellHNm ** 2) / 2)));

  const tiles: QueryTile[] = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      tiles.push({
        lon: b.west + (b.east - b.west) * ((i + 0.5) / cols),
        lat: b.south + (b.north - b.south) * ((j + 0.5) / rows),
        radiusNm: radius,
      });
    }
  }
  return tiles;
}
