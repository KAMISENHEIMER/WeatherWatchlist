// Shapes shared across the backend. These also define the API contract
// (see docs/api.md); the frontend keeps its own copy of the public ones.

/** A saved location, exactly as stored in data/locations.json. */
export interface Location {
  id: string;
  name: string;
  region?: string; // state/province, when the geocoder provides one
  country: string;
  lat: number;
  lon: number;
  createdAt: string; // ISO timestamp
}

/** A geocoded place that hasn't been saved yet (no id or timestamp). */
export type NewLocation = Omit<Location, "id" | "createdAt">;

/** Current conditions for one location, already converted to our own field names. */
export interface CurrentWeather {
  temperatureC: number;
  humidityPct: number;
  windKmh: number;
  weatherCode: number; // raw WMO code from Open-Meteo
  condition: string; // human label for weatherCode, e.g. "Partly cloudy"
  observedAt: string; // time of the reading, as reported by Open-Meteo
}

/**
 * Weather for one location. `status` tells the frontend which case it is:
 *  - ok:          fresh data (from the API or a cache entry younger than the TTL)
 *  - stale:       the API failed, so this is the last good reading we had
 *  - unavailable: the API failed and we have nothing cached
 */
export type WeatherResult =
  | { status: "ok"; data: CurrentWeather; fetchedAt: string }
  | { status: "stale"; data: CurrentWeather; fetchedAt: string; ageMinutes: number }
  | { status: "unavailable"; error: string };

/** What GET /api/locations returns per entry: the location plus its weather. */
export interface WatchlistItem extends Location {
  weather: WeatherResult;
}
