// Every call to Open-Meteo goes through this file (requirement R1: the browser
// never talks to the weather API; only this server does).
//
// The URLs are fixed here. The frontend can never make us fetch an arbitrary URL.

import type { NewLocation } from "./types";
import { parseGeocodeResponse } from "./conversions";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

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
