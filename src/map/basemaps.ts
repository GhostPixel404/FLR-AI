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

// Tactical: Esri Dark Gray Canvas — minimal, high-contrast dark ops look (keyless).
const TACTICAL = rasterStyle(
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
  '© Esri',
);

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
