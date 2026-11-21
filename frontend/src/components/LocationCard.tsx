import { useState } from "react";
import type { WatchlistItem } from "../types";
import WeatherIcon from "./WeatherIcon";

interface Props {
  item: WatchlistItem;
  /** Deletes the location. Rejects with an Error if it couldn't be removed. */
  onRemove: (id: string) => Promise<void>;
}

/** One saved place. Renders all three weather states the backend can return. */
export default function LocationCard({ item, onRemove }: Props) {
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const { weather } = item;
  const place = [item.region, item.country].filter(Boolean).join(", ");

  async function handleRemove() {
    setRemoving(true);
    setRemoveError(null);
    try {
      await onRemove(item.id);
      // On success the parent drops this card, so there's nothing to reset.
    } catch (err) {
      setRemoveError((err as Error).message);
      setRemoving(false);
    }
  }

  return (
    <article className="card">
      <div className="card-head">
        <div>
          <h3 className="card-name">{item.name}</h3>
          <span className="card-place">{place}</span>
        </div>
        <button
          type="button"
          className="btn-icon"
          onClick={handleRemove}
          disabled={removing}
          aria-label={`Remove ${item.name}`}
          title={`Remove ${item.name}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {weather.status === "unavailable" ? (
        <div className="unavailable">
          <strong>Weather unavailable right now</strong>
          <span>The weather service didn't respond. This city is still saved.</span>
        </div>
      ) : (
        <>
          <div className="card-now">
            <WeatherIcon code={weather.data.weatherCode} />
            <div>
              <div className="card-temp">{Math.round(weather.data.temperatureC)}°</div>
              <div className="card-condition">{weather.data.condition}</div>
            </div>
          </div>
          <dl className="card-stats">
            <div>
              <dt>Humidity</dt>
              <dd>{weather.data.humidityPct}%</dd>
            </div>
            <div>
              <dt>Wind</dt>
              <dd>{Math.round(weather.data.windKmh)} km/h</dd>
            </div>
          </dl>
          {weather.status === "stale" && (
            <span className="stale-badge">Last updated {weather.ageMinutes} min ago</span>
          )}
        </>
      )}

      {removeError && (
        <p className="form-error" role="alert">
          {removeError}
        </p>
      )}
    </article>
  );
}
