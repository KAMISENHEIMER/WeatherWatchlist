import { useCallback, useEffect, useState } from "react";
import { getLocations } from "./api";
import type { WatchlistItem } from "./types";

/** The page is always in exactly one of these states; never a blank screen. */
type PageState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; items: WatchlistItem[] };

export default function App() {
  const [page, setPage] = useState<PageState>({ kind: "loading" });

  const load = useCallback(async () => {
    setPage({ kind: "loading" });
    try {
      setPage({ kind: "ready", items: await getLocations() });
    } catch (err) {
      setPage({ kind: "error", message: (err as Error).message });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main>
      <h1>Weather Watchlist</h1>
      {page.kind === "loading" && <p>Loading your watchlist…</p>}
      {page.kind === "error" && (
        <p>
          {page.message} <button onClick={load}>Try again</button>
        </p>
      )}
      {page.kind === "ready" && (
        <ul>
          {page.items.map((item) => (
            <li key={item.id}>
              {item.name}: {item.weather.status === "unavailable"
                ? item.weather.error
                : `${item.weather.data.temperatureC}°C, ${item.weather.data.condition}`}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
