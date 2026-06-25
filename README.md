# FlightRadar AI

A static, client-only live flight-tracking web app with an AI assistant built for aviation enthusiasts. No backend required — everything runs in your browser.

---

## What it is

FlightRadar AI shows live aircraft on an interactive map powered by real-time ADS-B data. Click any aircraft to see its route, airline, and photos. An integrated AI assistant — backed by your choice of Gemini, OpenRouter, or a local Ollama model — lets you control the map, identify aircraft, configure alerts, and ask questions about what you are seeing, all through natural language.

---

## Features

- **Live map** — real-time aircraft positions from airplanes.live, updated every 6 seconds (configurable), with smooth dead-reckoning interpolation between polls
- **Click for details** — route (origin/destination), airline name, aircraft photo, registration, and type enriched from adsbdb.com
- **Filters and search** — filter by altitude range, aircraft type (ICAO code), airline callsign prefix, military, emergency squawk, or ground/airborne status; instant search jumps to a callsign
- **Follow mode** — lock the map to trail a specific aircraft
- **Emergency squawk highlight** — aircraft squawking 7500/7600/7700 are highlighted red with a pulsing halo
- **Flight trails** — the selected aircraft draws its recent track
- **AI chat assistant** — map control (incl. "fly to <airport/city/country>"), aircraft identification, "track the nearest…", alert configuration, and stats questions via function-calling; pick **Gemini**, **OpenRouter**, or **local Ollama** (see below). The assistant shows which tools each reply used
- **Basemaps & theme** — switch between Light, Dark, and Satellite maps; manual light/dark/system theme toggle (the map follows it)
- **My location** — one-tap geolocation drops a marker, recentres, and sets your home for proximity alerts
- **Browser notification alerts** — define alert rules (by type, airline, military, emergency squawk, altitude, proximity to home); debounced browser notifications fire when rules match
- **Session stats dashboard** — unique aircraft count, breakdown by type, rarest sightings; persisted across sessions in IndexedDB
- **Settings** — AI provider/model, unit system (imperial/metric), refresh rate, theme, basemap, and home location

---

## Data sources

All data sources are free and require no API keys from you:

| Source | What it provides |
|--------|-----------------|
| [airplanes.live](https://airplanes.live) | Live ADS-B positions (CORS-open, free) |
| [adsbdb.com](https://www.adsbdb.com) | Route, airline, owner, photo enrichment (free) |
| [CARTO basemaps](https://carto.com) | Light (Voyager) & dark (dark-matter) vector tiles (free, no key) |
| [Esri World Imagery](https://www.arcgis.com) | Satellite basemap (free, no key) |
| [OSM Nominatim](https://nominatim.org) | Geocoding for the AI's "fly to <place>" (free) |

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

## AI assistant & providers

The chat assistant uses **function calling** so it can actually drive the app — query visible aircraft, fly to places by name, follow the nearest match, create alerts, and read your session stats. Pick a provider in **Settings → AI provider**. All calls happen in the browser, so the provider must allow cross-origin (CORS) requests.

### Option 1 — Google Gemini (default)

1. Create a free key at [Google AI Studio](https://aistudio.google.com/app/apikey).
2. **Settings → AI provider → Gemini**, paste the key.
3. Default model is `gemini-2.5-flash`. If you hit the free-tier limit, switch to `gemini-2.0-flash` or `gemini-2.5-flash-lite` (separate, often higher limits), or wait for the per-minute / daily reset.

Best tool-calling quality. Works from the deployed site.

### Option 2 — OpenRouter (free cloud, OpenAI-compatible)

A good free fallback that still runs from the deployed site with no hardware.

1. Create a free key at [openrouter.ai](https://openrouter.ai).
2. **Settings → AI provider → OpenAI-compatible →** the **OpenRouter** preset.
3. Paste the key and set **Model** to a free, **tool-capable** model (browse the `:free` models — not all support function calling), e.g. `meta-llama/llama-3.3-70b-instruct:free`.

### Option 3 — Local model via Ollama (free, private)

Runs entirely on your machine. Free, no rate limits, fully private — but your-machine-only and a step weaker at multi-step tool calls than Gemini.

1. Install [Ollama](https://ollama.com) and pull a tool-capable model: `ollama pull llama3.1` (or `qwen2.5`).
2. Start it allowing browser access: `OLLAMA_ORIGINS=* ollama serve`.
3. **Settings → AI provider → OpenAI-compatible →** the **Ollama** preset (sets `http://localhost:11434/v1`, model `llama3.1`, no key needed).

> **Mixed-content note:** the **HTTPS** deployed site calling `http://localhost` is allowed in Chrome but blocked in some browsers. The reliable way to use local Ollama is to run the app locally (`bun run dev`, then `http://localhost:5173`) so it's same-scheme.

All keys are stored only in your browser's `localStorage`.

---

## Security note (important)

Because this is a static client-side app, whichever API key you use (Gemini or OpenRouter) is stored in `localStorage` and is visible to anyone with access to your browser's developer tools. To reduce risk:

- **Restrict the key where possible.** In [Google AI Studio](https://aistudio.google.com/app/apikey) / [Google Cloud Console](https://console.cloud.google.com/apis/credentials), restrict the Gemini key by HTTP referrer to your deployed origin (e.g. `https://your-app.vercel.app/*`). On OpenRouter, set a low credit limit on the key.
- **Treat keys as low-privilege** and prefer free-tier keys for a public deployment.
- **Local Ollama needs no key** — it's the most private option (nothing leaves your machine).
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

44 tests covering: unit conversions, geo math, ADS-B normalization (incl. placeholder callsigns), filters, interpolation, stats aggregation, alert engine, enrichment parsers, GeoJSON builder, flight trails, AI tool dispatch (incl. geocoded fly-to), and the poll loop.

---

## Tech stack

| Layer | Library |
|-------|---------|
| Build | [Vite](https://vitejs.dev) + [TypeScript](https://www.typescriptlang.org) |
| UI | [React 19](https://react.dev) |
| Map | [MapLibre GL JS](https://maplibre.org) |
| State | [Zustand](https://zustand-demo.pmnd.rs) |
| Persistence | [idb](https://github.com/jakearchibald/idb) (IndexedDB wrapper) |
| AI | [@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai) (Gemini) + OpenAI-compatible fetch (OpenRouter / Ollama) |
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
  poll/             Dead-reckoning interpolation, trails, poll loop
  enrich/           adsbdb route/photo enrichment + Nominatim geocoding (IndexedDB cache)
  db/               Shared IndexedDB wrapper (idb.ts)
  stats/            Sighting aggregation + stats store
  alerts/           Alert engine (pure) + alert store + browser notifications
  ai/               System prompt, function-call tools, Gemini + OpenAI-compatible
                    assistants, and the provider factory
  map/              MapLibre layer builder, basemaps, plane icon, MapView component
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
