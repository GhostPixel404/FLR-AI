export interface GeoResult { lat: number; lon: number; zoom: number; name: string }

/**
 * Resolve a place name (airport, city, country, landmark) to coordinates via
 * OpenStreetMap Nominatim (keyless, CORS-open). Returns null if not found.
 */
export async function geocode(query: string): Promise<GeoResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<Record<string, any>>;
    if (!Array.isArray(data) || data.length === 0) return null;
    const r = data[0];
    const lat = parseFloat(r.lat);
    const lon = parseFloat(r.lon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return null;

    // Pick a sensible zoom from the result kind.
    const addr = r.addresstype as string | undefined;
    const cls = r.class as string | undefined;
    const type = r.type as string | undefined;
    let zoom = 11;
    if (addr === 'country' || type === 'country') zoom = 5;
    else if (cls === 'aeroway' || type === 'aerodrome') zoom = 12;
    else if (addr === 'city' || type === 'city') zoom = 10;
    else if (addr === 'state' || type === 'administrative') zoom = 7;

    return { lat, lon, zoom, name: (r.display_name as string) ?? query };
  } catch {
    return null;
  }
}
