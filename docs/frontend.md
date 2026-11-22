# Frontend

React 19 + TypeScript, built and served by Vite. One page showing the watchlist as cards (the "Tiles" design). It talks only to the backend's `/api` routes, documented in [api.md](api.md).

## Running it

Start the backend first (see [backend.md](backend.md)), then:

```sh
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # tsc type-check only
npm run build      # type-check + production bundle in dist/
```

`vite.config.ts` proxies every `/api` request from `:5173` to the backend on `:3001`. The browser only ever talks to the Vite server (same origin, so no CORS setup), and never to Open-Meteo (**R1**). You can confirm this in DevTools → Network: the only data requests are `/api/locations`.

## Files

| File | What it has and does |
| --- | --- |
| [`index.html`](../frontend/index.html) | The HTML shell: a `#root` div, the Google Fonts link (Inter + Space Grotesk; system fonts are the fallback when offline), and the script tag that loads `main.tsx`. |
| [`vite.config.ts`](../frontend/vite.config.ts) | Enables the React plugin and sets up the `/api` → `localhost:3001` dev proxy. |
| [`src/main.tsx`](../frontend/src/main.tsx) | Entry point. Mounts `<App />` into `#root` inside `StrictMode` and imports the stylesheet. |
| [`src/App.tsx`](../frontend/src/App.tsx) | The page and the only place that holds watchlist state. `PageState` is `loading`, `error` or `ready`, so the screen is never blank. Loads the list on mount. `handleAdd` and `handleRemove` call the API and then update state. Renders the header, form, and one of: skeletons, server-down panel, empty panel, or the card grid. |
| [`src/api.ts`](../frontend/src/api.ts) | The only file that calls `fetch`. `getLocations`, `addLocation` and `removeLocation` all go through `request()`, which adds a 15 s timeout and turns every failure into an `ApiError` with a message safe to show the user. `serverDown` is true when the backend couldn't be reached at all, as opposed to the backend answering "city not found". |
| [`src/types.ts`](../frontend/src/types.ts) | A copy of the backend's public types (`WatchlistItem`, `WeatherResult`, `CurrentWeather`). Kept in sync by hand. |
| [`src/styles.css`](../frontend/src/styles.css) | All styling, in plain CSS. Colours and fonts are CSS variables at the top. A `:root[data-theme="dark"]` block redefines the same variables for dark mode, so no other rule knows about themes. The page is up to 1480px wide and the grid uses `auto-fill`, so it shows 1 column on a phone, then 2, 3, 4, up to 5 on a wide screen. |
| [`src/components/AddCityForm.tsx`](../frontend/src/components/AddCityForm.tsx) | The "Add a city" input and button. Owns its own input text, `submitting` and `error` state. Rejects blank input locally; otherwise calls `onAdd` and shows the server's message under the input if it throws ("Couldn't find a city…", "…already in your watchlist", server down). Disabled while saving; clears on success. |
| [`src/components/LocationCard.tsx`](../frontend/src/components/LocationCard.tsx) | One saved place. Shows each `weather.status` differently: `ok` (icon, temperature, condition, humidity, wind), `stale` (the same plus a "Last updated N min ago" badge), `unavailable` (a dashed "Weather unavailable right now" box). Has the remove button, with its own `removing` and error state. |
| [`src/components/WeatherIcon.tsx`](../frontend/src/components/WeatherIcon.tsx) | Maps a WMO weather code to one of six inline SVG line icons (sun, partly cloudy, cloud, rain, snow, storm). Decorative only (`aria-hidden`), since the condition text is shown next to it. Icon colours come from CSS classes so dark mode can change them. |
| [`src/components/LastUpdated.tsx`](../frontend/src/components/LastUpdated.tsx) | The small "Last updated 3m ago" text next to the place count. Uses the newest `fetchedAt` across all cards, which is when the backend last called Open-Meteo. It's the cached time, so reloading within 10 minutes doesn't reset it. Has its own 30-second timer so the label counts up while the page is open, and clears the timer when unmounted. |
| [`src/components/ThemeToggle.tsx`](../frontend/src/components/ThemeToggle.tsx) | The "Dark mode" switch in the footer (`role="switch"`). Sets `data-theme` on `<html>` and remembers the choice in `localStorage`. Uses `useLayoutEffect` so the theme is applied before the first paint, with no flash of the light page. |
| [`src/components/LoadingGrid.tsx`](../frontend/src/components/LoadingGrid.tsx) | Three pulsing placeholder cards shown while the first load is in flight. |
| [`src/components/ServerDown.tsx`](../frontend/src/components/ServerDown.tsx) | The full-width panel shown when the watchlist can't be loaded: the error message and a "Try again" button that re-runs the load. |

## How data flows

```
App (holds PageState)
 ├─ AddCityForm ── onAdd(name) ──► App.handleAdd ──► api.addLocation ──► POST /api/locations
 └─ LocationCard ── onRemove(id) ─► App.handleRemove ─► api.removeLocation ─► DELETE /api/locations/:id
 (on mount) App.load ──► api.getLocations ──► GET /api/locations
```

- **State lives in `App` only.** Children get data through props and report actions through callbacks. Each child keeps just its own UI state (input text, "submitting", its error message).
- **Errors are shown where they happen.** A failed load replaces the grid with `ServerDown`. A failed add shows under the input. A failed remove shows on that card. One failure never blanks the page.
- **No reload after add or remove.** POST returns the new item with its weather, so `App` appends it; DELETE just filters the item out. Both updates use the functional form `setPage(current => …)`, so an add and a remove that overlap can't overwrite each other.
- **A 404 on remove counts as success.** The location is already gone, which is the outcome the user wanted.

## How each failure looks

| Situation | What the user sees |
| --- | --- |
| First load in progress | Skeleton cards |
| Backend not running | "Couldn't load your watchlist / Can't reach the server…" + Try again |
| Open-Meteo down, older reading cached | Normal card + amber "Last updated N min ago" badge |
| Open-Meteo down, nothing cached | Card with "Weather unavailable right now"; the city stays saved |
| Unknown city / duplicate / blank input | Red message under the input |
| Nothing saved yet | "No places yet" panel |

## Known limits

- **No automatic refresh.** Weather updates when the page reloads; a refresh button or timer would be a small addition. "Last updated" keeps counting while the page is open, but nothing fetches new data on its own.
- **Dark mode doesn't follow the system setting.** It defaults to light and remembers the user's choice; reading `prefers-color-scheme` as the default would be a one-line change.
- **Types are copied, not shared.** If the backend's response shape changes, `src/types.ts` must be updated by hand.
- **No frontend tests.** Behaviour was checked by driving the running app in a headless browser (add, errors, remove, server down, phone width). The backend's R2–R4 logic does have automated tests.
- **Dev server only.** `npm run build` produces static files, but serving them together with the API (and the `/api` proxy) in production is out of scope.
