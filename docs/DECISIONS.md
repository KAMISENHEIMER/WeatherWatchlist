# Decisions

## Key decisions (and what I rejected)

- **Backend and frontend as separate projects with one fixed contract.** I built and tested the API with curl before writing any UI, and the contract ([api.md](api.md)) didn't change once the frontend started. TypeScript on both sides. *Rejected:* a shared types package or single project level build function. The public types are copied into the frontend instead: duplicated, but the two projects stay independent to allow for individual testing of both.
- **JSON file + an in-process write queue (R4).** Every store operation runs through a promise-chain lock covering the whole read-modify-write, not just the write. Writes go to a temp file that's renamed over the real one, so a crash can't leave half-written JSON. A file that won't parse returns an error and is *never* treated as empty, because the next write would erase every saved location. *Rejected:* SQLite. It handles concurrency for you, but it's more to set up, and I wanted to own and be able to explain how R4 is met.
- **One `GET /api/locations` that returns each location with its weather.** *Rejected:* separate `/locations` and `/weather` endpoints. Two calls would let the list render before the weather arrives, but one call keeps the frontend simple. The cost: if Open-Meteo hangs, the page waits up to the 5 s upstream timeout.
- **Per-location failure, never all-or-nothing (R3).** `getWeather` never throws. Each location comes back `ok`, `stale` (an expired cached reading served when Open-Meteo fails) or `unavailable`, and the endpoint always returns 200. The UI shows each state on its own card.
- **In-memory cache keyed by rounded coordinates, 10-minute TTL (R2).** Expired entries are kept on purpose, because they're the stale fallback. Simultaneous requests for an uncached city share one Open-Meteo call. *Rejected:* Redis, which is unnecessary for a single process.

## What breaks at larger scale

- **Multiple users on the database:** the write lock and the cache only exist inside one Node process. Running more than one server would corrupt the file and split the cache. I'd move to a real database (Postgres or SQL) and a shared cache (Redis).
- **Fewer Open-Meteo calls:** batch them (Open-Meteo accepts many coordinates in one request), and briefly cache failures so a down API doesn't cost 5 s on every request.
- **Cache size:** add eviction (entries for deleted cities currently stay until restart). Also rate-limit the API.
- **Frontend:** component tests, and serving the built frontend and API together for production.

## What the AI got wrong (and how it was fixed)

- **Misleading "Last updated" header.** The AI added one "Last updated Xm ago" for the whole page, taken from the newest card's fetch time. Each location is cached separately, so there's no single age for the page, and removing the newest card made the number jump. I removed it and kept the per-card stale badge.
- **Stale state in React.** `handleAdd` built the new list from the state *as it was when the add started*. A card removed while geocoding was in progress would reappear. Fixed with a functional `setPage(current => …)`.
- **Theme saved on every load.** The dark-mode toggle wrote the theme to `localStorage` on every page load, not just on click. When I made dark the default, every earlier visitor was already stored as "light" and would never have seen it. Fixed by saving only on click, under a new key.
- **"Server down" detection.** Behind the Vite dev proxy, a stopped backend isn't a network error: it's a `502` with an empty body. The backend also returns `502` (with JSON) when geocoding fails, so the status code alone can't tell them apart. The client now checks for our JSON error body.
- **A test that couldn't finish.** The first test for a hung Open-Meteo request was cancelled by Node, because `AbortSignal.timeout`'s timer doesn't keep the process alive. This wasn't an app bug (the server's open socket keeps it alive); the test needed a keep-alive.
- **Scope creep.** The AI repeatedly suggested extras that were too much for an app this size. I kept the scope small and wrote down ideas for expansion later.

## Knowingly cut (to stay inside 3 hours)

- City autocomplete or a map picker. Open-Meteo's geocoder already resolves the closest match on submit.
- Forecasts, history, and comparison charts across cities you have saved.
- Looking at the Open-Mateo Documentation, theres a lot of other interesting features that wouldve been fun to implement with more time, such as air quality, satelite radiation, or climate models. 
- Automatic refresh and a manual refresh button (weather updates on reload).
