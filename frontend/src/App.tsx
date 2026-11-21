import { useCallback, useEffect, useState } from "react";
import { getLocations } from "./api";
import type { WatchlistItem } from "./types";
import LoadingGrid from "./components/LoadingGrid";
import LocationCard from "./components/LocationCard";
import ServerDown from "./components/ServerDown";

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

  const count = page.kind === "ready" ? page.items.length : null;

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1 className="title">Weather Watchlist</h1>
          <p className="subtitle">
            {count === null
              ? "Current weather for the places you follow"
              : `${count} saved ${count === 1 ? "place" : "places"}`}
          </p>
        </div>
      </header>

      <main>
        {page.kind === "loading" && <LoadingGrid />}
        {page.kind === "error" && <ServerDown message={page.message} onRetry={load} />}
        {page.kind === "ready" && (
          <section className="grid" aria-label="Saved locations">
            {page.items.map((item) => (
              <LocationCard key={item.id} item={item} />
            ))}
          </section>
        )}
      </main>

      <footer className="footer">Weather data from Open-Meteo.</footer>
    </div>
  );
}
