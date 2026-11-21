// R2 proof: weather is cached, so repeat requests within the TTL don't call
// Open-Meteo again. Uses a fake fetch, so no network is needed.
// Run with: npm test

import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { CACHE_TTL_MS, getWeather } from "../src/api";

const FORECAST_BODY = {
  current: {
    time: "2026-11-21T12:00",
    temperature_2m: 10,
    relative_humidity_2m: 50,
    weather_code: 2,
    wind_speed_10m: 5,
  },
};

// Every test uses its own coordinates so the shared cache doesn't leak between tests.
let fakeFetch: ReturnType<typeof mock.method>;
beforeEach(() => {
  mock.restoreAll();
  mock.timers.reset();
  fakeFetch = mock.method(globalThis, "fetch", async () => Response.json(FORECAST_BODY));
});

test("second request within the TTL is served from cache", async () => {
  const first = await getWeather(1, 1);
  const second = await getWeather(1, 1);

  assert.equal(first.status, "ok");
  assert.deepEqual(second, first);
  assert.equal(fakeFetch.mock.callCount(), 1);
});

test("after the TTL expires, Open-Meteo is called again", async () => {
  mock.timers.enable({ apis: ["Date"], now: 0 });
  await getWeather(2, 2);
  mock.timers.tick(CACHE_TTL_MS + 1);
  await getWeather(2, 2);

  assert.equal(fakeFetch.mock.callCount(), 2);
});

test("simultaneous requests with an empty cache share one Open-Meteo call", async () => {
  const results = await Promise.all([getWeather(3, 3), getWeather(3, 3), getWeather(3, 3)]);

  assert.ok(results.every((r) => r.status === "ok"));
  assert.equal(fakeFetch.mock.callCount(), 1);
});

// ---- R3: graceful degradation ----

const failingFetch = async () => {
  throw new TypeError("fetch failed"); // what Node's fetch throws when offline
};

test("API down with nothing cached -> unavailable, no throw", async () => {
  mock.method(globalThis, "fetch", failingFetch);
  const result = await getWeather(4, 4);
  assert.equal(result.status, "unavailable");
});

test("API down after TTL expired -> serves the old reading as stale", async () => {
  mock.timers.enable({ apis: ["Date"], now: 0 });
  await getWeather(5, 5); // fills the cache via the working fake fetch

  mock.method(globalThis, "fetch", failingFetch);
  mock.timers.tick(CACHE_TTL_MS + 5 * 60_000); // 15 minutes later

  const result = await getWeather(5, 5);
  assert.equal(result.status, "stale");
  assert.ok(result.status === "stale" && result.ageMinutes === 15);
});

test("API hangs -> request is aborted by the timeout -> unavailable (takes ~5s)", async () => {
  // A fetch that never answers, but gives up when its abort signal fires,
  // just like the real fetch does.
  mock.method(globalThis, "fetch", (_url: URL, init: RequestInit) =>
    new Promise((_resolve, reject) => {
      init.signal!.addEventListener("abort", () => reject(init.signal!.reason));
    }),
  );
  // AbortSignal.timeout's timer doesn't keep Node alive by itself. In the real
  // server the open HTTP socket does that; here an interval stands in for it.
  const keepAlive = setInterval(() => {}, 1000);
  const started = Date.now();
  const result = await getWeather(8, 8);
  const elapsed = Date.now() - started;
  clearInterval(keepAlive);

  assert.equal(result.status, "unavailable");
  assert.ok(elapsed >= 4900 && elapsed < 7000, `took ${elapsed} ms`);
});

test("API returns an HTTP error -> unavailable", async () => {
  mock.method(globalThis, "fetch", async () => new Response("oops", { status: 503 }));
  assert.equal((await getWeather(6, 6)).status, "unavailable");
});

test("API returns JSON in an unexpected shape -> unavailable", async () => {
  mock.method(globalThis, "fetch", async () => Response.json({ current: { time: "x" } }));
  assert.equal((await getWeather(7, 7)).status, "unavailable");
});
