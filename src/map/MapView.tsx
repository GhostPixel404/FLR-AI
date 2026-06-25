import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStore } from '../store/useStore';
import { matchesFilters } from '../store/filters';
import { toGeoJSON } from './aircraftLayer';
import { loadPlaneImage } from './icons';
import { deadReckon } from '../poll/interpolate';
import { getTrailLine } from '../poll/trails';

// Clean, Apple-Maps-like basemaps (free, keyless, CORS-open). Picked once at
// load from the system color scheme so the map matches the Liquid Glass chrome.
const STYLE = window.matchMedia('(prefers-color-scheme: dark)').matches
  ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
  : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const SRC = 'aircraft';

export default function MapView({ onReady }: { onReady: (api: { flyTo: (lat: number, lon: number, zoom: number) => void }) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const lastToastRef = useRef<number>(0);
  const lastFollowRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current, style: STYLE, center: [-0.45, 51.47], zoom: 9,
    });
    mapRef.current = map;
    onReady({ flyTo: (lat, lon, zoom) => map.flyTo({ center: [lon, lat], zoom }) });

    map.on('load', async () => {
      const img = await loadPlaneImage();
      map.addImage('plane', img, { sdf: true });
      map.addSource(SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'aircraft-layer', type: 'symbol', source: SRC,
        layout: {
          'icon-image': 'plane', 'icon-rotate': ['get', 'rotation'],
          'icon-allow-overlap': true, 'icon-size': 0.8,
          'icon-rotation-alignment': 'map',
        },
        paint: {
          'icon-color': ['case', ['get', 'emergency'], '#dc2626',
            ['get', 'selected'], '#f59e0b', ['get', 'military'], '#16a34a', '#1d4ed8'],
        },
      });
      map.addLayer({
        id: 'emergency-halo', type: 'circle', source: SRC,
        filter: ['==', ['get', 'emergency'], true],
        paint: { 'circle-radius': 16, 'circle-color': '#dc2626', 'circle-opacity': 0.3 },
      }, 'aircraft-layer');
      map.addSource('trail', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'trail-line', type: 'line', source: 'trail',
        paint: { 'line-color': '#f59e0b', 'line-width': 2, 'line-opacity': 0.8 },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      }, 'aircraft-layer');
    });

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
