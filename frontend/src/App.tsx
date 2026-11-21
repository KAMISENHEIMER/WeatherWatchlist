import { useCallback, useEffect, useState } from "react";
import { addLocation, ApiError, getLocations, removeLocation } from "./api";
import type { WatchlistItem } from "./types";
import AddCityForm from "./components/AddCityForm";
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

  // Load once when the page opens.
  useEffect(() => {
    load();
  }, [load]);

  // Errors are left to throw: AddCityForm shows them under the input.
  async function handleAdd(name: string) {
    const item = await addLocation(name);
    if (page.kind !== "ready") {
      // The list failed to load earlier but the server is evidently back: reload it.
      load();
      return;
    }
    // The server returns the new item with its weather, so no reload is needed.
    // Functional update: build on the list as it is NOW, not as it was when the
    // add started. Otherwise a card removed while geocoding would come back.
    setPage((current) =>
      current.kind === "ready" ? { kind: "ready", items: [...current.items, item] } : current,
    );
  }

  // Errors are left to throw: LocationCard shows them on the card.
  async function handleRemove(id: string) {
    try {
      await removeLocation(id);
    } catch (err) {
      // 404 means it's already gone (e.g. removed in another tab), which is what we wanted.
      if (!(err instanceof ApiError && err.status === 404)) throw err;
    }
    // Functional update: two quick removals mustn't overwrite each other's result.
    setPage((current) =>
      current.kind === "ready"
        ? { kind: "ready", items: current.items.filter((i) => i.id !== id) }
        : current,
    );
  }

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
        <AddCityForm onAdd={handleAdd} />
      </header>

      <main>
        {page.kind === "loading" && <LoadingGrid />}

        {page.kind === "error" && <ServerDown message={page.message} onRetry={load} />}

        {page.kind === "ready" && page.items.length === 0 && (
          <div className="panel">
            <h2>No places yet</h2>
            <p>Add a city above to see its current weather here.</p>
          </div>
        )}

        {page.kind === "ready" && page.items.length > 0 && (
          <section className="grid" aria-label="Saved locations">
            {page.items.map((item) => (
              <LocationCard key={item.id} item={item} onRemove={handleRemove} />
            ))}
          </section>
        )}
      </main>

      <footer className="footer">Weather data from Open-Meteo.</footer>
    </div>
  );
}
