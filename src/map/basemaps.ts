import type { StyleSpecification } from 'maplibre-gl';
import type { BasemapId } from '../types';

export type { BasemapId };

export const BASEMAP_OPTIONS: { id: BasemapId; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'satellite', label: 'Satellite' },
];

// Richer, Apple-Maps-like vector styles (free, keyless).
const LIGHT = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
const DARK = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

// Esri World Imagery + CARTO label raster overlay (both keyless, CORS-open).
const SATELLITE: StyleSpecification = {
  version: 8,
  sources: {
    esri: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
    },
    labels: {
      type: 'raster',
      tiles: ['https://basemaps.cartocdn.com/rastertiles/dark_only_labels/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© CARTO',
    },
  },
  layers: [
    { id: 'esri', type: 'raster', source: 'esri' },
    { id: 'labels', type: 'raster', source: 'labels' },
  ],
};

export function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Resolve a basemap choice to a MapLibre style (URL or inline spec). */
export function styleFor(basemap: BasemapId): string | StyleSpecification {
  switch (basemap) {
    case 'light': return LIGHT;
    case 'dark': return DARK;
    case 'satellite': return SATELLITE;
    case 'auto':
    default: return prefersDark() ? DARK : LIGHT;
  }
}
