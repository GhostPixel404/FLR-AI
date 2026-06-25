# FlightRadar + AI Assistant — Design Spec

**Date:** 2026-06-25
**Status:** Approved (pending written-spec review)

## Goal

A from-scratch live flight-tracking web app for aviation enthusiasts, with an
integrated AI assistant that can control the map, identify/explain aircraft,
set up alerts, and answer stats questions. Must run for free on static hosting
(GitHub Pages or Vercel) with no required backend.

## Key decisions

- **Platform:** Desktop-first web app.
- **Stack:** Vite + React + TypeScript + MapLibre GL. State: Zustand.
  Persistence: IndexedDB (via `idb`) + localStorage. Tests: Vitest.
- **Live data:** `airplanes.live` REST API, fetched **directly from the browser**
  (confirmed `access-control-allow-origin: *`, no proxy needed). Polled by the
  current map viewport.
- **Enrichment:** `adsbdb.com` for callsign→route/airline and hex/reg→aircraft
  details. Cached in IndexedDB. Degrades gracefully on failure.
- **Basemap:** OpenFreeMap vector style (free, no API key).
- **AI:** Google Gemini via `@google/generative-ai`, called client-side, using
  **function calling** so the assistant invokes the same actions the UI does.
  Key stored in localStorage; documented to be restricted by HTTP referrer.
- **Architecture stance:** Approach A (pure static client) now, built behind
  clean interfaces (`FlightProvider`, alert engine, stats store) so Approach B
  (Vercel serverless + cron + hosted DB for 24/7 collection, hidden key, and
  closed-tab alerts) can be added later without a rewrite.

## Module breakdown

- **`data/`** — `FlightProvider` interface; `AirplanesLiveProvider` polls by map
  bounds, dedups, normalizes to an internal `Aircraft` model.
  `provider.poll(bounds) -> Aircraft[]`.
- **`enrich/`** — `getRoute(callsign)`, `getAircraftInfo(hex|reg)` via adsbdb,
  cached in memory + IndexedDB.
- **`store/`** — Zustand app state: aircraft, selection, filters, followed
  aircraft, settings.
- **`map/`** — MapLibre + OpenFreeMap. Aircraft as a GPU GeoJSON **symbol layer**
  rotated by track. Selection, flight-trail polylines, airport/emergency overlays.
  `map.update(aircraft[])`.
- **`stats/`** — IndexedDB rolling log of seen aircraft + periodic snapshots;
  aggregations for the dashboard. `stats.query(range, metric)`.
- **`alerts/`** — user rules evaluated each poll → browser notifications + in-app
  toasts; persisted in IndexedDB. `engine.evaluate(aircraft[])`.
- **`ai/`** — Gemini client + system prompt + function-calling tool registry that
  bridges to map/store/alerts/stats. Chat panel UI.
- **`ui/`** — shell: map canvas, left flight list + detail panel, search, filter
  bar, AI chat drawer, alerts manager, settings.

## Data flow (poll loop)

`AirplanesLiveProvider.poll(viewport)` every ~5–8 s → normalize →
`store.setAircraft()` → subscribers react: (1) `map` updates GeoJSON source,
(2) `stats` logs presence, (3) `alerts.evaluate()` checks rules. Positions are
**interpolated between polls** via `requestAnimationFrame` for smooth motion.

## AI flow

User message → Gemini receives message + a compact summary of currently-visible
aircraft + the tool declarations → model calls tools (mutating map/store/alerts
or reading stats) → tool results returned → model replies. AI actions are "real"
because tools call the same functions as the UI.

### AI tools (function declarations)

```
Map control:   setMapView({lat,lon,zoom})   flyTo({airport|city|country})
               setFilter({altitudeBand,type,airline,military,emergency,onGround})
               clearFilters()   trackAircraft({hex})   untrack()
Query/explain: queryFlights({filter})            -> matching visible aircraft
               getAircraftDetails({hex|registration}) -> live state + enrichment
               getRoute({callsign})              -> origin/destination/airline
Alerts:        createAlert({name, criteria})   listAlerts()   deleteAlert({id})
Stats:         queryStats({range, metric})
```

Identification and "why is it circling/holding?" use model aviation knowledge
plus `getAircraftDetails`/`getRoute`.

## v1 feature list

- Live aircraft map in viewport, auto-refresh, smooth interpolated movement,
  rotated icons.
- Click aircraft → detail panel (callsign, reg, type, airline, alt/speed/heading/
  vertical-rate, squawk, route when known) + flight trail.
- Filters (altitude / type / airline / military / on-ground / **emergency
  squawk**) + text search by callsign/reg/hex.
- Follow mode (map tracks a chosen aircraft).
- **Emergency squawk auto-highlight** (7500/7600/7700).
- AI chat assistant (all tools above).
- Alerts manager (rules + browser notifications; fire while tab open).
- Session/stats dashboard (rarest & most common types, totals, busiest periods,
  "aircraft seen" log).
- Settings: refresh rate, metric/imperial units, home location, Gemini API key.

## Non-functional requirements & error handling

- **Rate-limit friendly:** one request per poll, viewport-bounded radius, ~5–8 s
  interval; exponential backoff on errors with a "stale data" indicator.
- **Performance:** GPU symbol layer, source-data updates only (no DOM markers);
  rAF interpolation; "too many — zoom in" notice at extreme zoom-out.
- **Persistence:** IndexedDB (stats, alerts, enrichment cache); localStorage
  (settings + key).
- **Failure modes:** feed down → retry w/ backoff + stale badge; enrichment
  failure → degrade gracefully; Gemini error/no key → friendly inline message
  pointing to settings.
- **Key safety:** README documents restricting the Gemini key by HTTP referrer;
  fully-hidden keys require the Approach B upgrade.

## Testing

- **Vitest units:** provider normalization, alert-rule matching, stats
  aggregation, AI tool-dispatch (mocked Gemini).
- **Integration:** poll loop with mocked fetch; map source update.
- **Manual:** live run against airplanes.live.

## Out of scope for v1 (future / Approach B)

- 24/7 background collection, multi-day historical stats, closed-tab alerts.
- Server-side hidden API keys.
- Push notifications via ntfy/Telegram/email.
- Mobile-first layout, native/desktop packaging.

## Deployment / git note

Repo creation and all git operations are **deferred** until the user logs into
the intended GitHub account. No `git init` or commits until then.
