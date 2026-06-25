import type { UnitSystem } from './util/units';

export interface Aircraft {
  hex: string;
  callsign: string | null;
  registration: string | null;
  type: string | null;          // ICAO type code, e.g. "B772"
  description: string | null;   // human description from feed
  lat: number;
  lon: number;
  altitude: number | null;      // feet; null when unknown
  onGround: boolean;
  groundSpeed: number | null;   // knots
  track: number | null;         // degrees true
  verticalRate: number | null;  // ft/min
  squawk: string | null;
  emergency: string | null;     // 'none' or an emergency string
  category: string | null;      // ADS-B emitter category, e.g. "A3"
  military: boolean;
  distanceNm: number | null;    // distance from query center (nm)
  seen: number;                 // seconds since last message
  lastUpdate: number;           // epoch ms when received
}

export interface Filters {
  altitudeMin: number | null;
  altitudeMax: number | null;
  type: string | null;          // case-insensitive substring of ICAO type
  airline: string | null;       // case-insensitive callsign prefix
  military: boolean;
  emergency: boolean;
  onGround: boolean | null;     // null = any, true = only ground, false = only airborne
}

export interface AlertCriteria {
  type?: string;
  airlinePrefix?: string;
  military?: boolean;
  emergency?: boolean;
  belowAltitude?: number;       // feet
  withinKm?: number;            // from home location
  registration?: string;
  callsign?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  criteria: AlertCriteria;
  enabled: boolean;
}

export interface Sighting {
  hex: string;
  callsign: string | null;
  type: string | null;
  firstSeen: number;            // epoch ms
  lastSeen: number;             // epoch ms
  count: number;                // number of polls seen in
}

export type BasemapId = 'auto' | 'light' | 'dark' | 'satellite';
export type ThemePref = 'system' | 'light' | 'dark';
export type AiProvider = 'gemini' | 'openai';

export interface Settings {
  aiProvider: AiProvider;
  geminiApiKey: string;
  geminiModel: string;
  // OpenAI-compatible provider (OpenRouter, local Ollama, etc.)
  openaiBaseUrl: string;
  openaiApiKey: string;
  openaiModel: string;
  units: UnitSystem;
  refreshSeconds: number;
  home: { lat: number; lon: number } | null;
  basemap: BasemapId;
  theme: ThemePref;
}

export const EMERGENCY_SQUAWKS = ['7500', '7600', '7700'] as const;

export const DEFAULT_FILTERS: Filters = {
  altitudeMin: null, altitudeMax: null, type: null, airline: null,
  military: false, emergency: false, onGround: null,
};
