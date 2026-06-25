import type { Aircraft } from '../types';
import { isEmergency } from '../store/filters';

export interface AircraftFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    hex: string; callsign: string; rotation: number;
    emergency: boolean; selected: boolean; military: boolean; onGround: boolean;
  };
}
export interface AircraftFC { type: 'FeatureCollection'; features: AircraftFeature[] }

export function toGeoJSON(list: Aircraft[], selectedHex: string | null): AircraftFC {
  return {
    type: 'FeatureCollection',
    features: list.map((a) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [a.lon, a.lat] },
      properties: {
        hex: a.hex,
        callsign: a.callsign ?? a.hex,
        rotation: a.track ?? 0,
        emergency: isEmergency(a),
        selected: a.hex === selectedHex,
        military: a.military,
        onGround: a.onGround,
      },
    })),
  };
}
