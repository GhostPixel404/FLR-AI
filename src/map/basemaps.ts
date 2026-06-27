import type { StyleSpecification } from 'maplibre-gl';
import type { BasemapId } from '../types';

export type { BasemapId };

// Always-available, keyless options.
const BASE_OPTIONS: { id: BasemapId; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'dark', label: 'Dark' },
  { id: 'tactical', label: 'Tactical' },
  { id: 'light', label: 'Light' },
  { id: 'satellite', label: 'Satellite' },
];

// Premium MapTiler styles, shown only when an API key is set.
const MAPTILER_OPTIONS: { id: BasemapId; label: string }[] = [
  { id: 'mt-dataviz', label: 'Dataviz Dark' },
  { id: 'mt-backdrop', label: 'Backdrop' },
  { id: 'mt-ocean', label: 'Ocean' },
  { id: 'mt-streets', label: 'Streets Dark' },
];

const MAPTILER_STYLE: Record<string, string> = {
  'mt-dataviz': 'dataviz-dark',
  'mt-backdrop': 'backdrop',
  'mt-ocean': 'ocean',
  'mt-streets': 'streets-v2-dark',
};

/** Basemap options to show in the picker, depending on whether a MapTiler key is set. */
export function basemapOptions(maptilerKey: string): { id: BasemapId; label: string }[] {
  return maptilerKey ? [...BASE_OPTIONS, ...MAPTILER_OPTIONS] : BASE_OPTIONS;
}

export const BASEMAP_OPTIONS = BASE_OPTIONS;

// Keyless vector styles (CARTO).
const LIGHT = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
const DARK = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

function rasterStyle(baseTiles: string, labelTiles: string | null, attribution: string): StyleSpecification {
  const style: StyleSpecification = {
    version: 8,
    sources: { base: { type: 'raster', tiles: [baseTiles], tileSize: 256, maxzoom: 19, attribution } },
    layers: [{ id: 'base', type: 'raster', source: 'base' }],
  };
  if (labelTiles) {
    style.sources.labels = { type: 'raster', tiles: [labelTiles], tileSize: 256 };
    style.layers.push({ id: 'labels', type: 'raster', source: 'labels' });
  }
  return style;
}

// Tactical: a crisp custom VECTOR style over CARTO's keyless vector tiles — a
// modern dark "ops" look (deep navy, subtle roads, highlighted runways, sharp
// uppercase labels). Vector = sharp at every zoom/DPI (unlike raster tiles).
const FONT = ['Montserrat Regular', 'Open Sans Regular', 'Noto Sans Regular', 'HanWangHeiLight Regular', 'NanumBarunGothic Regular'];
const FONT_IT = ['Montserrat Regular Italic', 'Open Sans Italic', 'Noto Sans Regular', 'HanWangHeiLight Regular', 'NanumBarunGothic Regular'];
const TACTICAL = {
  version: 8,
  glyphs: 'https://tiles.basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf',
  sources: { carto: { type: 'vector', url: 'https://tiles.basemaps.cartocdn.com/vector/carto.streets/v1/tiles.json', attribution: '© CARTO © OpenStreetMap' } },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#080b12' } },
    { id: 'landcover', type: 'fill', source: 'carto', 'source-layer': 'landcover', paint: { 'fill-color': '#0b101a', 'fill-opacity': 0.5 } },
    { id: 'park', type: 'fill', source: 'carto', 'source-layer': 'park', paint: { 'fill-color': '#0a1512', 'fill-opacity': 0.55 } },
    { id: 'water', type: 'fill', source: 'carto', 'source-layer': 'water', paint: { 'fill-color': '#0b1a2c' } },
    { id: 'waterway', type: 'line', source: 'carto', 'source-layer': 'waterway', paint: { 'line-color': '#11263c', 'line-width': 0.8 } },
    { id: 'building', type: 'fill', source: 'carto', 'source-layer': 'building', minzoom: 14, paint: { 'fill-color': '#121a28', 'fill-opacity': 0.6 } },
    { id: 'road-minor', type: 'line', source: 'carto', 'source-layer': 'transportation', minzoom: 11,
      filter: ['in', 'class', 'minor', 'service', 'tertiary'],
      paint: { 'line-color': '#19212e', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.4, 16, 2] } },
    { id: 'road-secondary', type: 'line', source: 'carto', 'source-layer': 'transportation',
      filter: ['in', 'class', 'secondary', 'primary'],
      paint: { 'line-color': '#26303f', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 16, 3] } },
    { id: 'road-trunk', type: 'line', source: 'carto', 'source-layer': 'transportation',
      filter: ['in', 'class', 'trunk', 'motorway'],
      paint: { 'line-color': '#37485f', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.6, 16, 4] } },
    { id: 'aeroway', type: 'line', source: 'carto', 'source-layer': 'aeroway', minzoom: 10,
      paint: { 'line-color': '#5e7690', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1, 15, 5] } },
    { id: 'boundary-country', type: 'line', source: 'carto', 'source-layer': 'boundary',
      filter: ['<=', 'admin_level', 2],
      paint: { 'line-color': '#33465f', 'line-width': 1, 'line-dasharray': [3, 2] } },
    { id: 'boundary-state', type: 'line', source: 'carto', 'source-layer': 'boundary', minzoom: 4,
      filter: ['==', 'admin_level', 4],
      paint: { 'line-color': '#1e2a3b', 'line-width': 0.6 } },
    { id: 'water-label', type: 'symbol', source: 'carto', 'source-layer': 'water_name', minzoom: 5,
      layout: { 'text-field': ['get', 'name'], 'text-font': FONT_IT, 'text-size': 11 },
      paint: { 'text-color': '#3c5872', 'text-halo-color': '#05080e', 'text-halo-width': 1 } },
    { id: 'place-label', type: 'symbol', source: 'carto', 'source-layer': 'place',
      filter: ['in', 'class', 'country', 'state', 'city', 'town'],
      layout: { 'text-field': ['get', 'name'], 'text-font': FONT, 'text-letter-spacing': 0.08, 'text-transform': 'uppercase',
        'text-size': ['interpolate', ['linear'], ['zoom'], 3, 10, 8, 13, 12, 16] },
      paint: { 'text-color': '#a3b6cc', 'text-halo-color': '#04070c', 'text-halo-width': 1.5 } },
  ],
} as unknown as StyleSpecification;

// Satellite imagery + label overlay (keyless).
const SATELLITE = rasterStyle(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  'https://basemaps.cartocdn.com/rastertiles/dark_only_labels/{z}/{x}/{y}.png',
  'Imagery © Esri, Maxar, Earthstar Geographics',
);

export function prefersDark(): boolean {
  const t = document.documentElement.dataset.theme;
  if (t === 'dark') return true;
  if (t === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Resolve a basemap choice to a MapLibre style (URL or inline spec). */
export function styleFor(basemap: BasemapId, maptilerKey = ''): string | StyleSpecification {
  if (basemap.startsWith('mt-')) {
    const style = MAPTILER_STYLE[basemap];
    if (style && maptilerKey) return `https://api.maptiler.com/maps/${style}/style.json?key=${maptilerKey}`;
    // No key → fall back to a keyless equivalent.
    return DARK;
  }
  switch (basemap) {
    case 'light': return LIGHT;
    case 'dark': return DARK;
    case 'tactical': return TACTICAL;
    case 'satellite': return SATELLITE;
    case 'auto':
    default: return prefersDark() ? DARK : LIGHT;
  }
}
