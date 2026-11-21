// Pure helper functions: no network, no file access.

/**
 * Coordinates rounded to 2 decimals (~1 km) as a string key.
 * Used for duplicate detection in the store and as the weather cache key,
 * so two places that are practically the same spot count as one.
 */
export function coordKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}
