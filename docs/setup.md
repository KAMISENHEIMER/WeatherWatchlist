# Setup

How to run Weather Watchlist on your machine. You need **two terminals**: one for the backend, one for the frontend.

## Prerequisites

- **Node.js 22.12 or newer** (20.19+ also works). Check with `node --version`. Download from [nodejs.org](https://nodejs.org).
- An internet connection (weather and city lookups come from [Open-Meteo](https://open-meteo.com); no API key or account needed).

## 1. Start the backend (terminal 1)

```sh
cd backend
npm install
npm run dev
```

Wait for: `Weather Watchlist API listening on http://localhost:3001`

## 2. Start the frontend (terminal 2)

```sh
cd frontend
npm install
npm run dev
```

Wait for the `Local: http://localhost:5173/` line.

## 3. Open the app

Go to **http://localhost:5173** in your browser and add a city.

Leave both terminals running while you use the app. Stop either one with `Ctrl+C`.

`npm install` is only needed the first time (or after pulling new dependencies). After that, `npm run dev` in each folder is enough.

## Ports

| What | Address |
| --- | --- |
| Frontend (open this one) | http://localhost:5173 |
| Backend API | http://localhost:3001/api |

The frontend forwards every `/api` request to the backend, so the backend must be running for the app to load data. If it isn't, the page shows "Couldn't load your watchlist" with a Try again button.

## Optional

| Command (run inside `backend/`) | What it does |
| --- | --- |
| `npm test` | Runs the backend tests (~6 s) |
| `npm start` | Runs the backend without auto-restarting on code changes |

Saved cities are stored in `backend/data/locations.json`, created on your first add. Delete that file to start with an empty watchlist.

## Troubleshooting

- **`Port 5173 is in use` or `EADDRINUSE :3001`**: another copy is already running. Use that one, or stop it first.
- **Page says "Couldn't load your watchlist"**: the backend isn't running. Start it (step 1), then click **Try again**.
- **Cards say "Weather unavailable right now"**: the backend can't reach Open-Meteo (e.g. no internet). Your cities are still saved; reload once you're back online.
