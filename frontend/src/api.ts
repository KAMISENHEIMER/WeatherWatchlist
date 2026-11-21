// The only file that makes HTTP requests. Every call goes to our own backend's
// /api routes (proxied by Vite), never to Open-Meteo directly (R1).
// The contract these functions follow is documented in docs/api.md.

import type { WatchlistItem } from "./types";

/** Give up on the backend after this long. It answers within ~5 s even when Open-Meteo hangs. */
const REQUEST_TIMEOUT_MS = 15_000;

const SERVER_DOWN_MESSAGE = "Can't reach the server. Check that the backend is running.";

/**
 * A request failed. `message` is always safe to show the user.
 * `serverDown` is true when the backend itself couldn't be reached, as opposed
 * to the backend answering with an error like "city not found".
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public serverDown = false,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    // Network failure or timeout: no response at all.
    throw new ApiError(SERVER_DOWN_MESSAGE, 0, true);
  }

  if (res.status === 204) return undefined as T;

  // Our backend always sends JSON. Anything else (e.g. Vite's proxy answering
  // 502 with an empty text body when the backend is off) means we never
  // reached it, even though we did get a response.
  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const message = (body as { error?: unknown } | null)?.error;
    if (typeof message === "string") throw new ApiError(message, res.status);
    throw new ApiError(SERVER_DOWN_MESSAGE, res.status, true);
  }
  if (body === null) throw new ApiError(SERVER_DOWN_MESSAGE, res.status, true);

  // Trusting our own backend's shape here (unlike the backend, which checks
  // Open-Meteo's responses); both sides share the types in types.ts.
  return body as T;
}

/** The whole watchlist with current weather. */
export function getLocations(): Promise<WatchlistItem[]> {
  return request<WatchlistItem[]>("/locations");
}

/** Geocodes and saves a city. Throws ApiError with the server's message (404, 409, ...). */
export function addLocation(name: string): Promise<WatchlistItem> {
  return request<WatchlistItem>("/locations", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function removeLocation(id: string): Promise<void> {
  return request<void>(`/locations/${encodeURIComponent(id)}`, { method: "DELETE" });
}
