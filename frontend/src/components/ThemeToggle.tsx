import { useLayoutEffect, useState } from "react";

type Theme = "light" | "dark";
const STORAGE_KEY = "weather-watchlist-theme";

/** The theme saved from the last visit; light if none (or storage is blocked). */
function savedTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

/**
 * Dark mode switch. Sets data-theme on <html>; styles.css swaps its colour
 * variables based on it. The choice is remembered in localStorage.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(savedTheme);
  const isDark = theme === "dark";

  // useLayoutEffect (not useEffect) applies the theme before the browser paints,
  // so a dark-mode user doesn't see a flash of the light page on load.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage blocked (e.g. private mode): the toggle still works for this visit.
    }
  }, [theme]);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      className="theme-toggle"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <span className="switch-track" aria-hidden="true">
        <span className="switch-knob" />
      </span>
      Dark mode
    </button>
  );
}
