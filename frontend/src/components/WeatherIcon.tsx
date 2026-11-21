// Picks a simple line icon for a WMO weather code (the same codes the backend
// labels in conversions.ts). Decorative only: the condition text is shown next to it.

type IconKind = "sun" | "partly" | "cloud" | "rain" | "snow" | "storm";

function iconKind(code: number): IconKind {
  if (code <= 1) return "sun"; // clear, mainly clear
  if (code === 2) return "partly"; // partly cloudy
  if (code === 3 || code === 45 || code === 48) return "cloud"; // overcast, fog
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain"; // drizzle, rain, showers
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "cloud";
}

const CLOUD = "M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 9.6 4.2 4.2 0 0 0 7 18z";
const SMALL_CLOUD = "M7 14h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 5.6 4.2 4.2 0 0 0 7 14z";

export default function WeatherIcon({ code }: { code: number }) {
  const kind = iconKind(code);
  const color = kind === "sun" || kind === "partly" ? "#b45309" : kind === "rain" ? "#1d4ed8" : "#475569";

  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "sun" && (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </>
      )}
      {kind === "partly" && (
        <>
          <path d="M8 3v1.5M3.5 8H2M4.8 4.8l1 1M12.4 6.2l1-1" />
          <path d="M5.3 10.6A3.5 3.5 0 0 1 11 6.4" />
          <path d={CLOUD} stroke="#475569" />
        </>
      )}
      {kind === "cloud" && <path d={CLOUD} />}
      {kind === "rain" && (
        <>
          <path d={SMALL_CLOUD} />
          <path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3" />
        </>
      )}
      {kind === "snow" && (
        <>
          <path d={SMALL_CLOUD} />
          <path d="M8 18h.01M12 18h.01M16 18h.01M10 21h.01M14 21h.01" strokeWidth="2.5" />
        </>
      )}
      {kind === "storm" && (
        <>
          <path d={SMALL_CLOUD} />
          <path d="M13 14l-2 4h3l-2 4" />
        </>
      )}
    </svg>
  );
}
