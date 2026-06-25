import type { Aircraft } from '../types';

const trails = new Map<string, [number, number][]>();

export function recordPositions(list: Aircraft[]): void {
  for (const a of list) {
    if (!isFinite(a.lat) || !isFinite(a.lon)) continue;
    let arr = trails.get(a.hex);
    if (!arr) {
      arr = [];
      trails.set(a.hex, arr);
    }
    const last = arr[arr.length - 1];
    if (last && last[0] === a.lon && last[1] === a.lat) continue;
    arr.push([a.lon, a.lat]);
    if (arr.length > 60) arr.shift();
  }
}

export function getTrailLine(hex: string | null): { type: 'FeatureCollection'; features: any[] } {
  if (hex === null) return { type: 'FeatureCollection', features: [] };
  const arr = trails.get(hex);
  if (!arr || arr.length < 2) return { type: 'FeatureCollection', features: [] };
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: arr },
      properties: {},
    }],
  };
}
