import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The dev server forwards every /api request to the backend. The browser only
// ever talks to this server (same origin, so no CORS) and never to Open-Meteo (R1).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
