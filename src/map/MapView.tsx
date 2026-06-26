import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStore } from '../store/useStore';
import { matchesFilters } from '../store/filters';
import { toGeoJSON } from './aircraftLayer';
import { loadPlaneImage } from './icons';
import { deadReckon } from '../poll/interpolate';
import { getTrailLine } from '../poll/trails';
import { styleFor } from './basemaps';
import { effectiveTheme } from '../util/theme';
import type { BasemapId, ThemePref } from '../types';

const SRC = 'aircraft';

/** A key that changes whenever the resolved basemap style should change. */
function styleKey(basemap: BasemapId, theme: ThemePref): string {
  return basemap === 'auto' ? `auto:${effectiveTheme(theme)}` : basemap;
}

/** Add the aircraft / trail / emergency overlay on top of the current basemap.
 *  Safe to call repeatedly — a style switch wipes these, so we re-add them. */
async function addOverlay(map: maplibregl.Map) {
  if (map.getSource(SRC)) return;                 // already present for this style
  const m = map as maplibregl.Map & { __overlayBusy?: boolean };
  if (m.__overlayBusy) return;                    // re-entrancy guard during await
  m.__overlayBusy = true;
  try {
    if (!map.hasImage('plane')) {
      const img = await loadPlaneImage();
      if (!map.hasImage('plane')) map.addImage('plane', img, { sdf: true });
    }
    if (map.getSource(SRC)) return;

    map.addSource(SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: 'aircraft-layer', type: 'symbol', source: SRC,
    layout: {
      'icon-image': 'plane', 'icon-rotate': ['get', 'rotation'],
      'icon-allow-overlap': true, 'icon-size': 0.85,
      'icon-rotation-alignment': 'map',
    },
    paint: {
      'icon-color': ['case', ['get', 'emergency'], '#ff453a',
        ['get', 'selected'], '#ff9f0a', ['get', 'military'], '#30d158', '#0a84ff'],
    },
  });
  map.addLayer({
    id: 'emergency-halo', type: 'circle', source: SRC,
    filter: ['==', ['get', 'emergency'], true],
    paint: { 'circle-radius': 16, 'circle-color': '#ff453a', 'circle-opacity': 0.3 },
  }, 'aircraft-layer');
  map.addSource('trail', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: 'trail-line', type: 'line', source: 'trail',
    paint: { 'line-color': '#ff9f0a', 'line-width': 2.5, 'line-opacity': 0.85 },
    layout: { 'line-cap': 'round', 'line-join': 'round' },
  }, 'aircraft-layer');
  } finally {
    m.__overlayBusy = false;
  }
}

/**
 * Ensure the overlay exists, polling until the (current) style is fully loaded.
 * Reliable for both the initial load and after `setStyle` — unlike the
 * `styledata`/`isStyleLoaded` event timing, which can be missed.
 */
function ensureOverlay(map: maplibregl.Map) {
  // Wait for the (new) style to finish loading; only then is the old source
  // gone and the new style ready for addLayer. addOverlay dedups internally.
  if (map.isStyleLoaded()) { void addOverlay(map); return; }
  setTimeout(() => ensureOverlay(map), 60);
}

export default function MapView({ onReady }: { onReady: (api: { flyTo: (lat: number, lon: number, zoom: number) => void }) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const lastToastRef = useRef<number>(0);
  const lastFollowRef = useRef<number>(0);
  const lastDataRef = useRef<number>(0);
  const locMarkerRef = useRef<maplibregl.Marker | null>(null);
  const basemap = useStore((s) => s.settings.basemap);
  const theme = useStore((s) => s.settings.theme);
  const myLocation = useStore((s) => s.myLocation);
  const styleKeyRef = useRef<string>('');

  // Init the map once.
  useEffect(() => {
    if (!containerRef.current) return;
    // Start at the saved location if we have one (startup geolocation will
    // refine it); otherwise a neutral fallback until location resolves.
    const home = useStore.getState().settings.home;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleFor(basemap),
      center: home ? [home.lon, home.lat] : [0, 25],
      zoom: home ? 10 : 3.2,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
    onReady({ flyTo: (lat, lon, zoom) => map.flyTo({ center: [lon, lat], zoom }) });

    // Reliable initial overlay add (and a styledata backstop).
    map.on('load', () => ensureOverlay(map));
    map.on('styledata', () => ensureOverlay(map));

    const updateBounds = () => {
      const b = map.getBounds();
      useStore.getState().setBounds({
        north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest(),
      });
    };
    map.on('moveend', updateBounds);
    map.on('load', updateBounds);

    map.on('click', 'aircraft-layer', (e) => {
      const hex = e.features?.[0]?.properties?.hex as string | undefined;
      if (hex) useStore.getState().select(hex);
    });
    map.on('mouseenter', 'aircraft-layer', () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('mouseleave', 'aircraft-layer', () => (map.getCanvas().style.cursor = ''));

    return () => map.remove();
  }, []);

  // Switch basemap when the setting (or the resolved theme, for "auto") changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const key = styleKey(basemap, theme);
    if (styleKeyRef.current === '') { styleKeyRef.current = key; return; } // initial style already set
    if (key === styleKeyRef.current) return;
    styleKeyRef.current = key;
    map.setStyle(styleFor(basemap));
    // Poll until the new style is ready, then re-add the aircraft overlay, so
    // flights keep showing after a basemap change.
    ensureOverlay(map);
  }, [basemap, theme]);

  // Draw / move the "my location" marker and recentre when it updates.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !myLocation) return;
    if (!locMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'my-location';
      el.innerHTML = '<span class="my-location__dot"></span>';
      locMarkerRef.current = new maplibregl.Marker({ element: el });
    }
    locMarkerRef.current.setLngLat([myLocation.lon, myLocation.lat]).addTo(map);
    map.flyTo({ center: [myLocation.lon, myLocation.lat], zoom: Math.max(map.getZoom(), 10), duration: 900 });
  }, [myLocation]);

  // Smooth render loop. Runs on rAF but only rebuilds the GeoJSON ~14×/sec so
  // it stays light even with many aircraft (still smooth via dead reckoning).
  useEffect(() => {
    let raf = 0;
    const render = () => {
      raf = requestAnimationFrame(render);
      const map = mapRef.current;
      if (!map || !map.getSource(SRC)) return;
      const now = Date.now();
      if (now - lastDataRef.current < 70) return;
      lastDataRef.current = now;

      const src = map.getSource(SRC) as maplibregl.GeoJSONSource;
      const trail = map.getSource('trail') as maplibregl.GeoJSONSource | undefined;

      // Only hide aircraft at a very wide world view (keeps them visible when
      // zoomed out without forcing the user to zoom in).
      if (map.getZoom() < 3) {
        src.setData({ type: 'FeatureCollection', features: [] });
        trail?.setData({ type: 'FeatureCollection', features: [] });
        if (now - lastToastRef.current > 10_000) {
          lastToastRef.current = now;
          window.dispatchEvent(new CustomEvent('flr-toast', { detail: 'Zoom in to see aircraft' }));
        }
        return;
      }

      const state = useStore.getState();
      const projected = Array.from(state.aircraft.values())
        .filter((a) => matchesFilters(a, state.filters))
        .map((a) => {
          // Cap extrapolation so a briefly-stale (retained) aircraft doesn't drift.
          const secs = Math.min((now - a.lastUpdate) / 1000, 12);
          const p = deadReckon(a, secs);
          return { ...a, lat: p.lat, lon: p.lon };
        });
      src.setData(toGeoJSON(projected, state.selectedHex));
      trail?.setData(getTrailLine(state.selectedHex));

      if (state.followedHex) {
        const f = projected.find((a) => a.hex === state.followedHex);
        if (f && now - lastFollowRef.current > 1000) {
          lastFollowRef.current = now;
          map.easeTo({ center: [f.lon, f.lat], duration: 800 });
        }
      }
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />;
}
