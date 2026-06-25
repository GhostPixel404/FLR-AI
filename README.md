# FlightRadar AI

A static, client-only live flight-tracking web app with a Gemini AI assistant built for aviation enthusiasts. No backend required — everything runs in your browser.

---

## What it is

FlightRadar AI shows live aircraft on an interactive map powered by real-time ADS-B data. Click any aircraft to see its route, airline, and photos. An integrated Gemini AI assistant lets you control the map, identify aircraft, configure alerts, and ask questions about what you are seeing — all through natural language.

---

## Features

- **Live map** — real-time aircraft positions from airplanes.live, updated every 6 seconds (configurable), with smooth dead-reckoning interpolation between polls
- **Click for details** — route (origin/destination), airline name, aircraft photo, registration, and type enriched from adsbdb.com
- **Filters and search** — filter by altitude range, aircraft type (ICAO code), airline callsign prefix, military, emergency squawk, or ground/airborne status; instant search jumps to a callsign
- **Follow mode** — lock the map to trail a specific aircraft
- **Emergency squawk highlight** — aircraft squawking 7500/7600/7700 are highlighted red with a pulsing halo
- **AI chat assistant** — four roles: map control (fly to locations, zoom), aircraft identification, alert configuration, and stats questions; powered by Gemini function-calling
- **Browser notification alerts** — define alert rules (by type, airline, military, emergency squawk, altitude, proximity to home); debounced browser notifications fire when rules match
- **Session stats dashboard** — unique aircraft count, breakdown by type, rarest sightings; persisted across sessions in IndexedDB
- **Settings** — unit system (imperial/metric), refresh rate, home location, Gemini API key and model selection

---

## Data sources

All data sources are free and require no API keys from you:

| Source | What it provides |
|--------|-----------------|
| [airplanes.live](https://airplanes.live) | Live ADS-B positions (CORS-open, free) |
| [adsbdb.com](https://www.adsbdb.com) | Route, airline, photo enrichment (free) |
| [OpenFreeMap](https://openfreemap.org) | Basemap tiles (free, no key) |

---

## Run locally

**Prerequisites:** [Bun](https://bun.sh) (the only runtime required — Node/npm are not needed)

```bash
# Install dependencies
bun install

# Start the development server
bun run dev
```

Open the localhost URL printed in the terminal (typically `http://localhost:5173`).

---

## Enabling the AI assistant

The AI chat assistant requires a Google Gemini API key:

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey) and create a free API key.
2. Open the app and click the **Settings** tab.
3. Paste your API key into the **Gemini API Key** field and save.

The key is stored in your browser's `localStorage` and never leaves your machine. The default model is `gemini-2.5-flash`; you can change it in Settings.

---

## Security note (important)

Because this is a static client-side app, the Gemini API key is stored in `localStorage` and is visible to anyone with access to your browser's developer tools. To reduce risk:

- **Restrict the key by HTTP referrer** in [Google AI Studio](https://aistudio.google.com/app/apikey) or [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Set the allowed referrer to your deployed origin (e.g. `https://your-app.vercel.app/*`). Requests from other origins will be rejected.
- **Treat the key as low-privilege** — Gemini generative AI keys cannot access your billing details or other Google services.
- Do not share screenshots of the Settings tab or your browser's local storage.

Fully hiding the key from the browser requires a serverless backend proxy (documented as "Approach B" in [`docs/superpowers/specs/`](docs/superpowers/specs/)). This is deferred as future work.

---

## Production build

```bash
bun run build
```

Outputs a fully static bundle to `dist/`. Serve `dist/` from any static host (Vercel, GitHub Pages, Netlify, Cloudflare Pages, etc.).

To preview the production build locally before deploying:

```bash
bun run preview
```

---

## Running tests

```bash
bunx vitest --run
```

37 tests across 11 test files covering: unit conversions, geo math, ADS-B normalization, filters, interpolation, stats aggregation, alert engine, enrichment parsers, GeoJSON builder, AI tool dispatch, and the poll loop.

---

## Tech stack

| Layer | Library |
|-------|---------|
| Build | [Vite](https://vitejs.dev) + [TypeScript](https://www.typescriptlang.org) |
| UI | [React 18](https://react.dev) |
| Map | [MapLibre GL JS](https://maplibre.org) |
| State | [Zustand](https://zustand-demo.pmnd.rs) |
| Persistence | [idb](https://github.com/jakearchibald/idb) (IndexedDB wrapper) |
| AI | [@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai) |
| Tests | [Vitest](https://vitest.dev) + [@testing-library/react](https://testing-library.com) |

---

## Project structure

```
src/
  main.tsx          Entry point
  App.tsx           Root layout (tabs, poll loop orchestration)
  types.ts          Shared TypeScript types (Aircraft, Filters, AlertRule, Settings, …)
  util/             Pure helpers: units.ts, geo.ts
  data/             ADS-B provider: airplanesLive.ts (airplanes.live API)
  store/            Zustand store (useStore.ts) + filter logic (filters.ts)
  poll/             Dead-reckoning interpolation + poll loop
  enrich/           adsbdb.com route/photo enrichment with IndexedDB cache
  db/               Shared IndexedDB wrapper (idb.ts)
  stats/            Sighting aggregation + stats store
  alerts/           Alert engine (pure) + alert store + browser notifications
  ai/               Gemini system prompt, function-call tools, assistant driver
  map/              MapLibre layer builder, plane icon, MapView component
  ui/               All panel components (FlightList, DetailPanel, FilterBar, SearchBox,
                    ChatPanel, AlertsManager, StatsDashboard, Settings, Toasts)
docs/
  superpowers/
    specs/          Design specifications and architecture decisions
    plans/          Implementation plan (2026-06-25-flightradar-ai.md)
```

---

## License

MIT
