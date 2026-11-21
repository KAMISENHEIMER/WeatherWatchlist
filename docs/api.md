# API Contract

Everything the frontend can call. The backend runs on `http://localhost:3001`; the frontend's dev server proxies `/api` there, so the browser only ever calls `/api/...` and never Open-Meteo (R1).

All bodies are JSON. **Every error response has the same shape:**

```json
{ "error": "Human-readable message, safe to show to the user" }
```

## Endpoints

| Method | Path | What it does |
| --- | --- | --- |
| GET | `/api/locations` | The whole watchlist, each location with its current weather |
| POST | `/api/locations` | Look up a city by name, save it, return it with weather |
| DELETE | `/api/locations/:id` | Remove a saved location |
| GET | `/api/health` | `{ "ok": true }` if the server is up |

### GET `/api/locations`

Returns `200` with `WatchlistItem[]` (an empty array if nothing is saved), in the order the locations were added.

**Always `200` even if Open-Meteo is down.** Each item's `weather.status` says what happened for that location, so the page can always render the list. Weather is cached for 10 minutes per location (R2). If Open-Meteo is slow, the request waits at most ~5 seconds before that location falls back to `stale` or `unavailable`.

| Status | Error | When |
| --- | --- | --- |
| 500 | `Saved locations file is corrupted; see server log` | `data/locations.json` isn't valid JSON |

### POST `/api/locations`

Request body:

```json
{ "name": "Paris" }
```

Returns `201` with the new `WatchlistItem`. The location is saved even if its weather lookup fails; `weather.status` is then `unavailable`.

| Status | Error | When |
| --- | --- | --- |
| 400 | `Please enter a city name` | `name` missing, not a string, or blank |
| 400 | `City name must be 100 characters or fewer` | name too long |
| 400 | `Request body must be valid JSON` | malformed body |
| 404 | `Couldn't find a city called "..."` | geocoder has no match |
| 409 | `Paris is already in your watchlist` | a saved location is within ~1 km (same coords to 2 decimals) |
| 502 | `Couldn't reach the location service. Please try again.` | Open-Meteo geocoding down or timed out |
| 500 | `Saved locations file is corrupted; see server log` | as above |

Only Open-Meteo's first match is used, so an ambiguous name like "Springfield" saves whichever one it ranks first. The response's `region` and `country` show which place was picked.

### DELETE `/api/locations/:id`

Returns `204` with no body.

| Status | Error | When |
| --- | --- | --- |
| 404 | `That location isn't in your watchlist` | no location has that id |

Any other unknown `/api/...` path returns `404 { "error": "Not found" }`.

## Types

These live in [`backend/src/types.ts`](../backend/src/types.ts).

```ts
interface WatchlistItem {
  id: string;            // UUID, use for DELETE
  name: string;          // "Paris"
  region?: string;       // "Île-de-France Region" (state/province; may be missing)
  country: string;       // "France" (empty string for places with no country)
  lat: number;
  lon: number;
  createdAt: string;     // ISO timestamp
  weather: WeatherResult;
}

type WeatherResult =
  | { status: "ok";          data: CurrentWeather; fetchedAt: string }
  | { status: "stale";       data: CurrentWeather; fetchedAt: string; ageMinutes: number }
  | { status: "unavailable"; error: string };

interface CurrentWeather {
  temperatureC: number;  // 8.5
  humidityPct: number;   // 92
  windKmh: number;       // 9.9
  weatherCode: number;   // WMO code, e.g. 3
  condition: string;     // label for weatherCode, e.g. "Overcast"
  observedAt: string;    // ISO time of the reading (Open-Meteo updates every 15 min)
}
```

How the frontend should read `weather.status`:

- **`ok`**: show the data. `fetchedAt` is when the server fetched it (up to 10 minutes ago if it came from the cache).
- **`stale`**: Open-Meteo is failing, so this is the last good reading. Show it with a note like "last updated 14 min ago" (`ageMinutes`).
- **`unavailable`**: Open-Meteo is failing and no reading is cached. Show `weather.error`.

If the request itself fails (backend not running), `fetch` rejects with a network error. That's the "server is down" case for the frontend to handle.

## Example

```json
GET /api/locations  ->  200
[
  {
    "id": "a243f5ab-cbcb-4883-8074-3b1520b3ad02",
    "name": "Paris",
    "region": "Île-de-France Region",
    "country": "France",
    "lat": 48.85341,
    "lon": 2.3488,
    "createdAt": "2026-11-21T22:38:40.488Z",
    "weather": {
      "status": "ok",
      "data": {
        "temperatureC": 8.5,
        "humidityPct": 92,
        "windKmh": 9.9,
        "weatherCode": 3,
        "condition": "Overcast",
        "observedAt": "2026-11-21T22:30:00Z"
      },
      "fetchedAt": "2026-11-21T22:39:47.414Z"
    }
  }
]
```
