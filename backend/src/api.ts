// Every call to Open-Meteo goes through this file (requirement R1: the browser
// never talks to the weather API; only this server does).
//
// The URLs are fixed here. The frontend can never make us fetch an arbitrary URL.

import type { CurrentWeather, NewLocation, WeatherResult } from "./types";
import { coordKey, parseForecastResponse, parseGeocodeResponse } from "./conversions";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

/** Give up on Open-Meteo after this long (R3: a slow API mustn't hang our server). */
const UPSTREAM_TIMEOUT_MS = 5000;

/** Open-Meteo was unreachable, slow, returned an error, or sent unexpected data. */
export class UpstreamError extends Error {}

/**
 * GET a URL and return its parsed JSON, or throw UpstreamError.
 * The timeout covers the whole request, including reading the body.
 */
async function fetchJson(url: URL): Promise<unknown> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
    if (!res.ok) throw new UpstreamError(`Open-Meteo responded with HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (err instanceof UpstreamError) throw err;
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new UpstreamError(`Open-Meteo did not respond within ${UPSTREAM_TIMEOUT_MS} ms`);
    }
    // fetch() rejects with a TypeError for network failures (DNS, offline, refused).
    throw new UpstreamError(`Could not reach Open-Meteo: ${(err as Error).message}`);
  }
}

// ---- Geocoding --------------------------------------------------------------

/** Looks up a city name. Returns null if Open-Meteo doesn't know it. */
export async function geocodeCity(name: string): Promise<NewLocation | null> {
  const url = new URL(GEOCODING_URL);
  url.searchParams.set("name", name);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const json = await fetchJson(url);
  try {
    return parseGeocodeResponse(json);
  } catch (err) {
    throw new UpstreamError((err as Error).message);
  }
}

// ---- Weather ----------------------------------------------------------------

async function fetchCurrentWeather(lat: number, lon: number): Promise<CurrentWeather> {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
  );
  url.searchParams.set("timezone", "GMT");

  const json = await fetchJson(url);
  try {
    return parseForecastResponse(json);
  } catch (err) {
    throw new UpstreamError((err as Error).message);
  }
}

// ---- Weather cache (requirement R2) -----------------------------------------
//
// In-memory, keyed by rounded coordinates. Lost on restart and not shared
// between server processes; fine for one server, the first thing to replace
// (e.g. with Redis) at scale.

/** How long a weather reading counts as fresh. */
export const CACHE_TTL_MS = 10 * 60 * 1000;

interface CacheEntry {
  data: CurrentWeather;
  fetchedAt: number; // Date.now() when Open-Meteo answered
}

const cache = new Map<string, CacheEntry>();

// Requests to Open-Meteo that are still in progress, by cache key. If two page
// loads arrive together with an empty cache, the second one waits for the first
// one's request instead of sending its own.
const inFlight = new Map<string, Promise<CacheEntry>>();

function fetchAndCache(key: string, lat: number, lon: number): Promise<CacheEntry> {
  const pending = inFlight.get(key);
  if (pending) {
    console.log(`cache WAIT ${key} (request already in progress)`);
    return pending;
  }

  console.log(`cache MISS ${key} -> calling Open-Meteo`);
  const request = fetchCurrentWeather(lat, lon)
    .then((data) => {
      const entry = { data, fetchedAt: Date.now() };
      cache.set(key, entry);
      return entry;
    })
    .finally(() => inFlight.delete(key)); // success or failure, the next caller starts fresh
  inFlight.set(key, request);
  return request;
}

/**
 * Weather for one location. NEVER throws, so one bad location can't break the
 * whole list (R3). In order of preference:
 *   1. fresh cache entry           -> "ok"
 *   2. live Open-Meteo reading     -> "ok"
 *   3. expired cache entry         -> "stale" (API failed, but we have old data)
 *   4. nothing                     -> "unavailable"
 *
 * Expired entries are deliberately kept in the cache because they're the
 * fallback for case 3.
 */
export async function getWeather(lat: number, lon: number): Promise<WeatherResult> {
  const key = coordKey(lat, lon);

  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    console.log(`cache HIT  ${key}`);
    return { status: "ok", data: cached.data, fetchedAt: new Date(cached.fetchedAt).toISOString() };
  }

  try {
    const entry = await fetchAndCache(key, lat, lon);
    return { status: "ok", data: entry.data, fetchedAt: new Date(entry.fetchedAt).toISOString() };
  } catch (err) {
    if (err instanceof UpstreamError) {
      console.warn(`weather failed for ${lat},${lon}: ${err.message}`);
    } else {
      console.error(`unexpected error getting weather for ${lat},${lon}:`, err);
    }

    if (cached) {
      const ageMinutes = Math.floor((Date.now() - cached.fetchedAt) / 60_000);
      console.log(`cache STALE ${key} (serving ${ageMinutes} min old reading)`);
      return {
        status: "stale",
        data: cached.data,
        fetchedAt: new Date(cached.fetchedAt).toISOString(),
        ageMinutes,
      };
    }
    return { status: "unavailable", error: "Weather is unavailable right now" };
  }
}
