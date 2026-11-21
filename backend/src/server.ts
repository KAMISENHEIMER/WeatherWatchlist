// HTTP layer: routes, input validation, and turning errors into JSON responses.
// Business logic lives in store.ts (saved locations) and api.ts (Open-Meteo).

import express, { type ErrorRequestHandler } from "express";
import { geocodeCity, UpstreamError } from "./api";
import {
  addLocation,
  DuplicateLocationError,
  listLocations,
  removeLocation,
  StoreCorruptError,
} from "./store";

const PORT = Number(process.env.PORT) || 3001;
const MAX_NAME_LENGTH = 100;

const app = express();
app.use(express.json());

// Express 5 passes errors thrown by async handlers to the error handler below,
// so the routes don't each need their own try/catch.

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/locations", async (_req, res) => {
  res.json(await listLocations());
});

app.post("/api/locations", async (req, res) => {
  const raw: unknown = req.body?.name;
  const name = typeof raw === "string" ? raw.trim() : "";
  if (name === "") {
    res.status(400).json({ error: "Please enter a city name" });
    return;
  }
  if (name.length > MAX_NAME_LENGTH) {
    res.status(400).json({ error: `City name must be ${MAX_NAME_LENGTH} characters or fewer` });
    return;
  }

  // Geocode BEFORE touching the store: it's a slow network call, and the store
  // lock would otherwise block every other request while we wait.
  let place;
  try {
    place = await geocodeCity(name);
  } catch (err) {
    if (err instanceof UpstreamError) {
      console.warn(`geocode failed for "${name}": ${err.message}`);
      res.status(502).json({ error: "Couldn't reach the location service. Please try again." });
      return;
    }
    throw err;
  }
  if (!place) {
    res.status(404).json({ error: `Couldn't find a city called "${name}"` });
    return;
  }

  try {
    const location = await addLocation(place);
    res.status(201).json(location);
  } catch (err) {
    if (err instanceof DuplicateLocationError) {
      res.status(409).json({ error: err.message });
      return;
    }
    throw err;
  }
});

app.delete("/api/locations/:id", async (req, res) => {
  const removed = await removeLocation(req.params.id);
  if (!removed) {
    res.status(404).json({ error: "That location isn't in your watchlist" });
    return;
  }
  res.status(204).end();
});

// Unknown /api route: JSON 404 instead of Express's default HTML page.
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Last stop for any error. Always answers with JSON, never an HTML stack trace.
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // express.json() rejects malformed request bodies with status 400.
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: "Request body must be valid JSON" });
    return;
  }
  if (err instanceof StoreCorruptError) {
    console.error(err.message);
    res.status(500).json({ error: "Saved locations file is corrupted; see server log" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Weather Watchlist API listening on http://localhost:${PORT}`);
});
