import type { Aircraft, AlertCriteria } from '../types';
import { EMERGENCY_SQUAWKS } from '../types';
import type { RouteInfo, AircraftInfo } from '../enrich/adsbdb';
import type { StatsSummary } from '../stats/aggregate';
import { geocode } from '../enrich/geocode';

export interface AircraftDetails { live: Aircraft | null; route: RouteInfo | null; info: AircraftInfo | null }

export interface ToolActions {
  setMapView: (lat: number, lon: number, zoom: number) => void;
  setFilter: (patch: Record<string, unknown>) => void;
  clearFilters: () => void;
  trackAircraft: (hex: string) => boolean;
  untrack: () => void;
  getVisibleAircraft: () => Aircraft[];
  getAircraftDetails: (idOrReg: string) => Promise<AircraftDetails>;
  getRoute: (callsign: string) => Promise<RouteInfo | null>;
  createAlert: (name: string, criteria: AlertCriteria) => Promise<string>;
  listAlerts: () => Promise<{ id: string; name: string }[]>;
  deleteAlert: (id: string) => Promise<void>;
  queryStats: () => Promise<StatsSummary>;
}

// Gemini FunctionDeclaration shape (kept loose to avoid SDK type coupling).
export const toolDeclarations = [
  { name: 'setMapView', description: 'Center/zoom the map.',
    parameters: { type: 'object', properties: {
      lat: { type: 'number' }, lon: { type: 'number' }, zoom: { type: 'number' } },
      required: ['lat', 'lon', 'zoom'] } },
  { name: 'setFilter', description: 'Filter visible aircraft. Fields: altitudeMin, altitudeMax, type, airline, military, emergency, onGround.',
    parameters: { type: 'object', properties: {
      altitudeMin: { type: 'number' }, altitudeMax: { type: 'number' },
      type: { type: 'string' }, airline: { type: 'string' },
      military: { type: 'boolean' }, emergency: { type: 'boolean' },
      onGround: { type: 'boolean' } } } },
  { name: 'flyTo', description: 'Move the map to a place the USER named — an airport, city, country, or landmark. The `query` must come from the user\'s request; never invent or default a location. Resolves the name to coordinates.',
    parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'clearFilters', description: 'Remove all filters.', parameters: { type: 'object', properties: {} } },
  { name: 'queryFlights', description: 'Return currently visible aircraft matching optional criteria (type, airline callsign prefix, military, emergency, belowAltitude). Results include a distanceNm field (distance from the current map centre) and are sorted nearest-first; a "nearest" field holds the closest match. Use this to answer "nearest"/"closest" questions and to find a hex id to track.',
    parameters: { type: 'object', properties: {
      type: { type: 'string' }, airline: { type: 'string' },
      military: { type: 'boolean' }, emergency: { type: 'boolean' },
      belowAltitude: { type: 'number' } } } },
  { name: 'trackAircraft', description: 'Follow an aircraft by hex id; the map keeps it centered.',
    parameters: { type: 'object', properties: { hex: { type: 'string' } }, required: ['hex'] } },
  { name: 'untrack', description: 'Stop following.', parameters: { type: 'object', properties: {} } },
  { name: 'getAircraftDetails', description: 'Live state + airline/owner/route for a hex id or registration.',
    parameters: { type: 'object', properties: { idOrReg: { type: 'string' } }, required: ['idOrReg'] } },
  { name: 'getRoute', description: 'Origin/destination/airline for a callsign.',
    parameters: { type: 'object', properties: { callsign: { type: 'string' } }, required: ['callsign'] } },
  { name: 'createAlert', description: 'Create an alert rule. Provide name and any of: type, airlinePrefix, military, emergency, belowAltitude, withinKm, registration, callsign.',
    parameters: { type: 'object', properties: {
      name: { type: 'string' }, type: { type: 'string' }, airlinePrefix: { type: 'string' },
      military: { type: 'boolean' }, emergency: { type: 'boolean' },
      belowAltitude: { type: 'number' }, withinKm: { type: 'number' },
      registration: { type: 'string' }, callsign: { type: 'string' } },
      required: ['name'] } },
  { name: 'listAlerts', description: 'List existing alert rules.', parameters: { type: 'object', properties: {} } },
  { name: 'deleteAlert', description: 'Delete an alert rule by id.',
    parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  { name: 'queryStats', description: 'Summary of aircraft seen this session: totals, counts by type, rarest types.',
    parameters: { type: 'object', properties: {} } },
];

function summarizeAircraft(a: Aircraft) {
  return { hex: a.hex, callsign: a.callsign, type: a.type, registration: a.registration,
    altitude: a.altitude, groundSpeed: a.groundSpeed, squawk: a.squawk,
    military: a.military, onGround: a.onGround,
    distanceNm: a.distanceNm != null ? Math.round(a.distanceNm) : null };
}

export async function dispatchTool(
  name: string, args: Record<string, any>, actions: ToolActions,
): Promise<Record<string, any>> {
  switch (name) {
    case 'setMapView':
      actions.setMapView(args.lat, args.lon, args.zoom);
      return { ok: true };
    case 'flyTo': {
      const place = await geocode(String(args.query ?? ''));
      if (!place) return { error: `Couldn't find a place named "${args.query}"` };
      actions.setMapView(place.lat, place.lon, place.zoom);
      return { ok: true, movedTo: place.name, lat: place.lat, lon: place.lon };
    }
    case 'setFilter':
      actions.setFilter(args);
      return { ok: true };
    case 'clearFilters':
      actions.clearFilters();
      return { ok: true };
    case 'queryFlights': {
      const list = actions.getVisibleAircraft().filter((a) => {
        if (args.type && !(a.type ?? '').toLowerCase().includes(String(args.type).toLowerCase())) return false;
        if (args.airline && !(a.callsign ?? '').toLowerCase().startsWith(String(args.airline).toLowerCase())) return false;
        if (args.military && !a.military) return false;
        if (args.emergency && !(a.squawk && (EMERGENCY_SQUAWKS as readonly string[]).includes(a.squawk))) return false;
        if (args.belowAltitude != null && (a.altitude ?? Infinity) >= args.belowAltitude) return false;
        return true;
      });
      // Sort nearest-first (distanceNm is from the current map centre) so the
      // model can answer "nearest" questions and track the closest match.
      list.sort((a, b) => (a.distanceNm ?? Infinity) - (b.distanceNm ?? Infinity));
      return {
        count: list.length,
        nearest: list[0] ? summarizeAircraft(list[0]) : null,
        aircraft: list.slice(0, 30).map(summarizeAircraft),
      };
    }
    case 'trackAircraft':
      return { ok: actions.trackAircraft(args.hex) };
    case 'untrack':
      actions.untrack();
      return { ok: true };
    case 'getAircraftDetails': {
      const d = await actions.getAircraftDetails(args.idOrReg);
      return { live: d.live ? summarizeAircraft(d.live) : null, route: d.route, info: d.info };
    }
    case 'getRoute':
      return { route: await actions.getRoute(args.callsign) };
    case 'createAlert': {
      const { name: alertName, ...criteria } = args;
      const id = await actions.createAlert(alertName, criteria as AlertCriteria);
      return { id };
    }
    case 'listAlerts':
      return { alerts: await actions.listAlerts() };
    case 'deleteAlert':
      await actions.deleteAlert(args.id);
      return { ok: true };
    case 'queryStats':
      return await actions.queryStats();
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
