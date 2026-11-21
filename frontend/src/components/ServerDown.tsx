interface Props {
  message: string;
  onRetry: () => void;
}

/** Shown instead of the grid when the watchlist couldn't be loaded at all. */
export default function ServerDown({ message, onRetry }: Props) {
  return (
    <div className="panel" role="alert">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 2l20 20" />
        <path d="M8.5 16.5a5 5 0 0 1 7 0" />
        <path d="M5 12.9a10 10 0 0 1 5.2-2.8" />
        <path d="M19 12.9a10 10 0 0 0-2.3-1.6" />
        <path d="M12 20h.01" />
      </svg>
      <h2>Couldn't load your watchlist</h2>
      <p>{message}</p>
      <button type="button" className="btn-primary" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
