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

/** Run `cb` once the (current) style is fully loaded. */
function whenStyleReady(map: maplibregl.Map, cb: () => void) {
  if (map.isStyleLoaded()) { cb(); return; }
  const handler = () => {
    if (map.isStyleLoaded()) { map.off('styledata', handler); cb(); }
  };
  map.on('styledata', handler);
}

/** Add the aircraft / trail / emergency overlay on top of the current basemap.
 *  Safe to call repeatedly — a style switch wipes these, so we re-add them. */
async function addOverlay(map: maplibregl.Map) {
  if (map.getSource(SRC)) return; // already present for this style
  if (!map.hasImage('plane')) {
    const img = await loadPlaneImage();
    if (!map.hasImage('plane')) map.addImage('plane', img, { sdf: true });
  }
  if (map.getSource(SRC)) return; // guard against the await racing a second call

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
}

export default function MapView({ onReady }: { onReady: (api: { flyTo: (lat: number, lon: number, zoom: number) => void }) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const lastToastRef = useRef<number>(0);
  const lastFollowRef = useRef<number>(0);
  const locMarkerRef = useRef<maplibregl.Marker | null>(null);
  const basemap = useStore((s) => s.settings.basemap);
  const theme = useStore((s) => s.settings.theme);
  const myLocation = useStore((s) => s.myLocation);
  const styleKeyRef = useRef<string>('');

  // Init the map once.
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleFor(basemap),
      center: [-0.45, 51.47], zoom: 9,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
    onReady({ flyTo: (lat, lon, zoom) => map.flyTo({ center: [lon, lat], zoom }) });

    map.on('load', () => { void addOverlay(map); });

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
    whenStyleReady(map, () => { void addOverlay(map); });
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

  // Smooth render loop: re-project with dead reckoning every animation frame.
  useEffect(() => {
    let raf = 0;
    const render = () => {
      const map = mapRef.current;
      const state = useStore.getState();
      if (map && map.getSource(SRC)) {
        if (map.getZoom() < 5) {
          (map.getSource(SRC) as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features: [] });
          if (map.getSource('trail')) {
            (map.getSource('trail') as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features: [] });
          }
          const now = Date.now();
          if (now - lastToastRef.current > 10_000) {
            lastToastRef.current = now;
            window.dispatchEvent(new CustomEvent('flr-toast', { detail: 'Zoom in to see aircraft' }));
          }
          raf = requestAnimationFrame(render);
          return;
        }
        const filtered = Array.from(state.aircraft.values()).filter((a) =>
          matchesFilters(a, state.filters));
        const projected = filtered.map((a) => {
          const secs = (Date.now() - a.lastUpdate) / 1000;
          const p = deadReckon(a, secs);
          return { ...a, lat: p.lat, lon: p.lon };
        });
        (map.getSource(SRC) as maplibregl.GeoJSONSource).setData(
          toGeoJSON(projected, state.selectedHex));
        if (map.getSource('trail')) {
          (map.getSource('trail') as maplibregl.GeoJSONSource).setData(getTrailLine(state.selectedHex));
        }
        if (state.followedHex) {
          const f = projected.find((a) => a.hex === state.followedHex);
          if (f) {
            const now = Date.now();
            if (now - lastFollowRef.current > 1000) {
              lastFollowRef.current = now;
              map.easeTo({ center: [f.lon, f.lat], duration: 800 });
            }
          }
        }
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />;
}
