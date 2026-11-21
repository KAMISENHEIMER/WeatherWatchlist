# Backend

Node + Express 5 + TypeScript. Saves locations to a JSON file and fetches their weather from Open-Meteo, with caching. The HTTP contract is in [api.md](api.md).

## Running it

Requires Node 20 or newer.

```sh
cd backend
npm install
npm start          # http://localhost:3001
npm run dev        # same, but restarts on file changes
npm test           # store + cache tests (~6 s; one test waits out the 5 s timeout)
npm run typecheck  # tsc type-check only; tsx runs the code, so there's no build step
```

Optional environment variables: `PORT` (default `3001`) and `WATCHLIST_DATA_FILE` (default `backend/data/locations.json`; the tests use it to write to a temp file).

## Files

| File | What it has and does |
| --- | --- |
| [`src/server.ts`](../backend/src/server.ts) | The HTTP layer. Defines the routes, validates input, calls the store and the Open-Meteo client, and maps errors to JSON responses with the right status code. A final error handler makes sure nothing ever returns an HTML error page. Starts the server. |
| [`src/store.ts`](../backend/src/store.ts) | Saved-location persistence (**R4**). Reads and writes `data/locations.json`. Every operation runs through `withLock()`, a promise queue that makes read-modify-write sequences run one at a time. Writes go to a `.tmp` file that's renamed over the real one, so a crash can't leave half-written JSON. A missing file means an empty list; an unparseable file throws `StoreCorruptError` and is never overwritten. Also rejects duplicates (`DuplicateLocationError`). |
| [`src/api.ts`](../backend/src/api.ts) | The only code that talks to Open-Meteo (**R1**). `fetchJson()` adds a 5 s timeout and turns every failure into `UpstreamError`. `geocodeCity()` turns a city name into coordinates. `getWeather()` returns current weather using the 10-minute in-memory cache (**R2**), shares one request between simultaneous callers, and falls back to stale data or "unavailable" instead of throwing (**R3**). |
| [`src/conversions.ts`](../backend/src/conversions.ts) | Pure functions, no I/O. Checks raw Open-Meteo JSON field by field and converts it into our types (`parseGeocodeResponse`, `parseForecastResponse`), maps WMO weather codes to labels (`weatherCodeLabel`), and builds the rounded-coordinate key used for duplicates and caching (`coordKey`). |
| [`src/types.ts`](../backend/src/types.ts) | The shared data shapes: `Location`, `NewLocation`, `CurrentWeather`, `WeatherResult`, `WatchlistItem`. The public ones are the API contract. |
| [`test/store.test.ts`](../backend/test/store.test.ts) | R4 tests: 50 simultaneous adds all saved; simultaneous duplicates, exactly one accepted; corrupt file reported and left untouched. |
| [`test/weather.test.ts`](../backend/test/weather.test.ts) | R2/R3 tests using a fake `fetch`: cache hit, TTL expiry, shared simultaneous requests, offline, HTTP error, malformed JSON, stale fallback, and a hung request cut off by the timeout. |
| `data/locations.json` | Created on first save. Gitignored. Format: `{ "locations": [ ...Location ] }`. |

## How a request flows

**`GET /api/locations`**: `server.ts` asks `store.listLocations()` for the saved list, then calls `api.getWeather()` for every location in parallel and attaches each result. `getWeather` never throws, so `Promise.all` can't fail partway; a broken location just carries `status: "unavailable"`.

**`POST /api/locations`**: validate `name` → `api.geocodeCity()` (outside the store lock, because it's a slow network call) → `store.addLocation()` (inside the lock: re-read the file, check duplicates, write) → attach weather → `201`.

**`getWeather(lat, lon)`** decision order:

1. Cache entry younger than 10 min → `ok` (logs `cache HIT`)
2. Same location already being fetched → wait for that request (logs `cache WAIT`)
3. Fetch from Open-Meteo → `ok`, and store in the cache (logs `cache MISS`)
4. Fetch failed but an expired entry exists → `stale` with `ageMinutes` (logs `cache STALE`)
5. Fetch failed, nothing cached → `unavailable`

## Known limits

- **One process only.** The write lock and the cache live in memory. Two server instances would share neither, and could corrupt each other's writes. At scale: a real database and a shared cache such as Redis.
- **The cache never evicts.** Entries for deleted locations stay until restart. Fine for a personal watchlist; at scale use an LRU cache or Redis TTLs.
- **Failures aren't cached.** While Open-Meteo is down, each request for an uncached location waits the full 5 s timeout again.
- **One Open-Meteo call per location.** Open-Meteo accepts many coordinates in one request, which would batch these calls.
- **Every operation rewrites the whole file.** Fine for dozens of locations; not for thousands of writes per second.
