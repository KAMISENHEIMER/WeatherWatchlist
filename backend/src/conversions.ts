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

// ---- Current weather --------------------------------------------------------

/**
 * Converts an Open-Meteo forecast response (requested with
 * current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m and
 * timezone=GMT) into CurrentWeather. Throws if any field is missing.
 */
export function parseForecastResponse(json: unknown): CurrentWeather {
  const current = (json as { current?: unknown } | null)?.current as
    | Record<string, unknown>
    | undefined;
  if (!current) throw new Error("forecast: response has no `current` block");

  const { time, temperature_2m, relative_humidity_2m, weather_code, wind_speed_10m } = current;
  if (
    typeof time !== "string" ||
    typeof temperature_2m !== "number" ||
    typeof relative_humidity_2m !== "number" ||
    typeof weather_code !== "number" ||
    typeof wind_speed_10m !== "number"
  ) {
    throw new Error("forecast: `current` is missing an expected field");
  }

  return {
    temperatureC: temperature_2m,
    humidityPct: relative_humidity_2m,
    windKmh: wind_speed_10m,
    weatherCode: weather_code,
    condition: weatherCodeLabel(weather_code),
    // Open-Meteo sends "2026-11-21T22:30" with no zone; we asked for GMT, so mark it UTC.
    observedAt: `${time}:00Z`,
  };
}

// ---- Weather codes ----------------------------------------------------------

// WMO weather interpretation codes, as documented at https://open-meteo.com/en/docs
const WEATHER_CODE_LABELS: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Freezing fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Heavy freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Heavy freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Light showers",
  81: "Showers",
  82: "Heavy showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with heavy hail",
};

export function weatherCodeLabel(code: number): string {
  return WEATHER_CODE_LABELS[code] ?? "Unknown";
}
