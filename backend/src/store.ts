// Flat-file persistence for saved locations (requirement R4: data integrity).
//
// Two rules keep the file safe:
//  1. Every operation runs through withLock(), so only one read-modify-write
//     touches the file at a time. Two requests can't both read [A] and then
//     overwrite each other's change.
//  2. Writes go to a temp file that is then renamed over the real file. A crash
//     mid-write leaves the old file intact rather than half-written JSON.
//
// Limitation: the lock lives in this process's memory. Two server processes
// sharing one file would NOT be protected.

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Location, NewLocation } from "./types";
import { coordKey } from "./conversions";

const DATA_FILE =
  process.env.WATCHLIST_DATA_FILE ??
  path.resolve(import.meta.dirname, "..", "data", "locations.json");
const TEMP_FILE = `${DATA_FILE}.tmp`;

/** The file exists but isn't valid watchlist JSON. We refuse to overwrite it. */
export class StoreCorruptError extends Error {}

/** A location at (practically) the same coordinates is already saved. */
export class DuplicateLocationError extends Error {
  constructor(public existing: Location) {
    super(`${existing.name} is already in your watchlist`);
  }
}

// ---- The lock ---------------------------------------------------------------

// `queue` is the promise for the most recently scheduled operation.
// Each new operation chains onto it, so operations run strictly one after another.
let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  // Run fn after the previous operation settles, whether it succeeded or failed.
  const run = queue.then(fn, fn);
  // Swallow errors on the queue itself so one failed operation doesn't jam
  // every later one. The caller still gets the error through `run`.
  queue = run.catch(() => {});
  return run;
}

// ---- Raw file access (only call these inside withLock) ----------------------

async function readAll(): Promise<Location[]> {
  let text: string;
  try {
    text = await fs.readFile(DATA_FILE, "utf8");
  } catch (err) {
    // No file yet just means nothing has been saved. Anything else is a real error.
    if (isErrnoCode(err, "ENOENT")) return [];
    throw err;
  }

  if (text.trim() === "") return [];

  // A file that won't parse must NOT be treated as empty: the next write would
  // replace it and silently delete every saved location.
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new StoreCorruptError(`${DATA_FILE} is not valid JSON; fix or delete it`);
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as { locations?: unknown }).locations)
  ) {
    throw new StoreCorruptError(`${DATA_FILE} has no "locations" array; fix or delete it`);
  }
  return (parsed as { locations: Location[] }).locations;
}

async function writeAll(locations: Location[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(TEMP_FILE, JSON.stringify({ locations }, null, 2), "utf8");
  await renameWithRetry(TEMP_FILE, DATA_FILE);
}

/**
 * On Windows, OneDrive sync or antivirus can briefly hold the target file open,
 * making rename fail with EPERM/EBUSY/EACCES. Those clear within milliseconds,
 * so retry a few times before giving up.
 */
async function renameWithRetry(from: string, to: string, attempts = 5): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await fs.rename(from, to);
      return;
    } catch (err) {
      const transient = ["EPERM", "EBUSY", "EACCES"].some((c) => isErrnoCode(err, c));
      if (!transient || attempt >= attempts) throw err;
      await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
    }
  }
}

function isErrnoCode(err: unknown, code: string): boolean {
  return err instanceof Error && (err as NodeJS.ErrnoException).code === code;
}

// ---- Public operations ------------------------------------------------------

export function listLocations(): Promise<Location[]> {
  return withLock(readAll);
}

/**
 * Saves a new location. The duplicate check happens inside the lock, so two
 * simultaneous requests for the same city can't both get through.
 */
export function addLocation(input: NewLocation): Promise<Location> {
  return withLock(async () => {
    const locations = await readAll();
    const key = coordKey(input.lat, input.lon);
    const existing = locations.find((l) => coordKey(l.lat, l.lon) === key);
    if (existing) throw new DuplicateLocationError(existing);

    const location: Location = {
      id: randomUUID(),
      ...input,
      createdAt: new Date().toISOString(),
    };
    await writeAll([...locations, location]);
    return location;
  });
}

/** Returns false if no location has that id. */
export function removeLocation(id: string): Promise<boolean> {
  return withLock(async () => {
    const locations = await readAll();
    const remaining = locations.filter((l) => l.id !== id);
    if (remaining.length === locations.length) return false;
    await writeAll(remaining);
    return true;
  });
}
