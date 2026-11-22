import { useEffect, useState } from "react";
import type { WatchlistItem } from "../types";

/**
 * "Last updated 3m ago": how long since the backend last fetched weather from
 * Open-Meteo, using the newest `fetchedAt` across all cards. Cached readings
 * keep their original fetchedAt, so a reload within the 10-minute cache
 * doesn't reset this to "just now".
 */
export default function LastUpdated({ items }: { items: WatchlistItem[] }) {
  // Re-render every 30 s so the label keeps counting up while the page is open.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer); // stop the timer when the component goes away
  }, []);

  const fetchTimes = items.flatMap((item) =>
    item.weather.status === "unavailable" ? [] : [Date.parse(item.weather.fetchedAt)],
  );
  if (fetchTimes.length === 0) return null; // no weather at all, so nothing to date

  // Math.max(0, ...) guards against small clock differences making it negative.
  const minutes = Math.max(0, Math.floor((now - Math.max(...fetchTimes)) / 60_000));
  const label =
    minutes < 1 ? "just now" : minutes < 60 ? `${minutes}m ago` : `${Math.floor(minutes / 60)}h ago`;

  return <span className="last-updated">Last updated {label}</span>;
}
