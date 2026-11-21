// Pure helper functions: no network, no file access.
// Turns raw Open-Meteo JSON into our own types, and weather codes into labels.
//
// Why check fields by hand? `await res.json()` returns `unknown` data from
// another server. A TypeScript type or `as` cast is only a promise to the
// compiler, not a check. If Open-Meteo changes its response, these functions
// fail loudly here instead of sending `undefined` to the frontend.

import type { CurrentWeather, NewLocation } from "./types";

/**
 * Coordinates rounded to 2 decimals (~1 km) as a string key.
 * Used for duplicate detection in the store and as the weather cache key,
 * so two places that are practically the same spot count as one.
 */
export function coordKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

// ---- Geocoding --------------------------------------------------------------

/**
 * Converts an Open-Meteo geocoding response into a NewLocation.
 * Returns null when the city wasn't found (Open-Meteo omits `results` entirely).
 * Throws if the response is shaped differently than expected.
 */
export function parseGeocodeResponse(json: unknown): NewLocation | null {
  const results = (json as { results?: unknown } | null)?.results;
  if (results === undefined) return null;
  if (!Array.isArray(results)) throw new Error("geocoding: `results` is not an array");
  if (results.length === 0) return null;

  const top = results[0] as Record<string, unknown>;
  const { name, country, admin1, latitude, longitude } = top;
  if (typeof name !== "string" || typeof latitude !== "number" || typeof longitude !== "number") {
    throw new Error("geocoding: result is missing name/latitude/longitude");
  }

  return {
    name,
    region: typeof admin1 === "string" ? admin1 : undefined,
    // Some places (e.g. Antarctica stations) have no country.
    country: typeof country === "string" ? country : "",
    lat: latitude,
    lon: longitude,
  };
}
