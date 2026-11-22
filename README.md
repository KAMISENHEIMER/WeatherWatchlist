# Weather Watchlist

A small full-stack app: save the places you care about and see the current weather for each.

- **Backend** (`backend/`): Node + Express + TypeScript. An API to add, remove and list saved locations, persisted to a JSON file. It fetches weather from [Open-Meteo](https://open-meteo.com) server-side, caches it for 10 minutes, and degrades gracefully when Open-Meteo is down.
- **Frontend** (`frontend/`): React + TypeScript (Vite). A card per location with temperature, conditions, humidity and wind, plus loading, error and stale-data states, and a light/dark theme.

The browser only ever talks to the backend's `/api`; it never calls Open-Meteo directly.

Design decisions, trade-offs and what the AI got wrong are in **[docs/DECISIONS.md](docs/DECISIONS.md)**.

## Running it

You need **two terminals**: one for the backend, one for the frontend.

### Prerequisites

- **Node.js 22.12 or newer** (20.19+ also works). Check with `node --version`.
- An internet connection. Weather and city lookups come from Open-Meteo; no API key or account is needed.

### 1. Start the backend (terminal 1)

```sh
cd backend
npm install
npm run dev
```

Wait for: `Weather Watchlist API listening on http://localhost:3001`

### 2. Start the frontend (terminal 2)

```sh
cd frontend
npm install
npm run dev
```

Wait for the `Local: http://localhost:5173/` line.

### 3. Open the app

Go to **http://localhost:5173** and add a city (e.g. "Paris").

Leave both terminals running while you use the app; stop either with `Ctrl+C`. `npm install` is only needed the first time.

| What | Address |
| --- | --- |
| Frontend (open this one) | http://localhost:5173 |
| Backend API | http://localhost:3001/api |

Saved cities live in `backend/data/locations.json`, created on the first add. Delete it to start with an empty watchlist.

### Troubleshooting

- **`Port 5173 is in use` or `EADDRINUSE :3001`**: another copy is already running. Use it, or stop it first.
- **Page says "Couldn't load your watchlist"**: the backend isn't running. Start it (step 1), then click **Try again**.
- **Cards say "Weather unavailable right now"**: the backend can't reach Open-Meteo (e.g. no internet). Your cities are still saved.

## Checking the hard requirements

| Requirement | How to see it |
| --- | --- |
| **R1** Server-side only | Browser DevTools → Network: the only data request is `/api/locations`. No request goes to open-meteo.com. |
| **R2** 10-minute cache | Reload the page twice. The backend terminal logs `cache MISS` the first time, then `cache HIT` for each city. |
| **R3** Graceful degradation | Disconnect from the internet and reload: cities still render, showing either their last reading with a "Last updated N min ago" badge or "Weather unavailable right now". Stop the backend: the page shows a "Couldn't load" panel with Try again, not a blank screen. |
| **R4** Data integrity | `cd backend && npm test` runs 50 simultaneous adds against the store and checks that all 50 are saved, plus duplicate and corrupt-file cases. |

`npm test` (in `backend/`, ~6 s) also covers the cache, the stale fallback, and the 5-second upstream timeout, using a fake `fetch` so it needs no network.

## Project layout

```
backend/     Express API: routes, JSON store, Open-Meteo client + cache, tests
frontend/    React app: API client, page state, components, styles
docs/
  DECISIONS.md   decisions, trade-offs, AI mistakes, what was cut
  api.md         the HTTP contract between frontend and backend
  backend.md     backend files and how a request flows
  frontend.md    frontend files, components and state
```
