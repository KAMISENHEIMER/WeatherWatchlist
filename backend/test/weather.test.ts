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
