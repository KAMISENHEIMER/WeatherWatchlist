import { useLayoutEffect, useState } from "react";

type Theme = "light" | "dark";

// Holds only a choice the user made by clicking. (An earlier version saved the
// theme on every page load under a different key, which would have pinned
// everyone to light mode; the new key ignores those values.)
const STORAGE_KEY = "weather-watchlist-theme-choice";

/** The user's saved choice, or dark (the default) if they never chose. */
function initialTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark"; // storage blocked (e.g. private mode)
  }
}

/**
 * Light/dark switch: a sun on the knob in light mode, a moon in dark mode.
 * Sets data-theme on <html>; styles.css swaps its colour variables based on it.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const isDark = theme === "dark";

  // useLayoutEffect (not useEffect) applies the theme before the browser paints.
  // index.html already starts as dark, so the default case never flashes.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggle() {
    const next: Theme = isDark ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage blocked: the switch still works for this visit.
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Dark mode"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="theme-toggle"
      onClick={toggle}
    >
      <span className="switch-track" aria-hidden="true">
        <span className="switch-knob">
          {isDark ? (
            // moon
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
            </svg>
          ) : (
            // sun
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          )}
        </span>
      </span>
    </button>
  );
}
