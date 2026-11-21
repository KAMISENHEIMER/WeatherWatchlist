// Copy of the public API types from backend/src/types.ts (see docs/api.md).
// Duplicated on purpose: frontend and backend stay independent projects, and
// the contract is small. If the backend's shapes change, update this file too.

export interface CurrentWeather {
  temperatureC: number;
  humidityPct: number;
  windKmh: number;
  weatherCode: number; // raw WMO code from Open-Meteo
  condition: string; // human label, e.g. "Partly cloudy"
  observedAt: string;
}

export type WeatherResult =
  | { status: "ok"; data: CurrentWeather; fetchedAt: string }
  | { status: "stale"; data: CurrentWeather; fetchedAt: string; ageMinutes: number }
  | { status: "unavailable"; error: string };

/** One saved location plus its weather, as returned by GET/POST /api/locations. */
export interface WatchlistItem {
  id: string;
  name: string;
  region?: string;
  country: string;
  lat: number;
  lon: number;
  createdAt: string;
  weather: WeatherResult;
}
