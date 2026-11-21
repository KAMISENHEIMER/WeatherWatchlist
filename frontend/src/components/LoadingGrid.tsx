/** Placeholder cards shown while the first GET /api/locations is in flight. */
export default function LoadingGrid() {
  return (
    <div className="grid" aria-busy="true">
      <span className="sr-only">Loading your watchlist…</span>
      {[1, 2, 3].map((n) => (
        <div key={n} className="card skeleton-card" aria-hidden="true">
          <div className="skeleton-line short" />
          <div className="skeleton-line big" />
          <div className="skeleton-line long" />
        </div>
      ))}
    </div>
  );
}
