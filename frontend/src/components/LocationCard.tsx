import type { WatchlistItem } from "../types";
import WeatherIcon from "./WeatherIcon";

interface Props {
  item: WatchlistItem;
}

/** One saved place. Renders all three weather states the backend can return. */
export default function LocationCard({ item }: Props) {
  const { weather } = item;
  const place = [item.region, item.country].filter(Boolean).join(", ");

  return (
    <article className="card">
      <div className="card-head">
        <div>
          <h3 className="card-name">{item.name}</h3>
          <span className="card-place">{place}</span>
        </div>
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
    </article>
  );
}
