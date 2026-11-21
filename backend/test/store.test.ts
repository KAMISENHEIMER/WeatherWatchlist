// R4 proof: many simultaneous writes must all land in the file, none lost.
// Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

// Point the store at a throwaway file BEFORE importing it (it reads the env var on load).
const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "watchlist-test-"));
const dataFile = path.join(tmpDir, "locations.json");
process.env.WATCHLIST_DATA_FILE = dataFile;
const store = await import("../src/store");

test("50 concurrent adds are all saved", async () => {
  const adds = Array.from({ length: 50 }, (_, i) =>
    store.addLocation({ name: `City ${i}`, country: "Testland", lat: i, lon: i }),
  );
  await Promise.all(adds);

  // Check the file itself, not just what the functions returned.
  const onDisk = JSON.parse(await fs.readFile(dataFile, "utf8"));
  assert.equal(onDisk.locations.length, 50);
});

test("concurrent duplicate adds: exactly one succeeds", async () => {
  const results = await Promise.allSettled([
    store.addLocation({ name: "Twin", country: "Testland", lat: 80, lon: 80 }),
    store.addLocation({ name: "Twin", country: "Testland", lat: 80, lon: 80 }),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const rejected = results.find((r) => r.status === "rejected");
  assert.ok(rejected && rejected.reason instanceof store.DuplicateLocationError);
});

test("a corrupt file is reported, not overwritten", async () => {
  await fs.writeFile(dataFile, "{ not json", "utf8");
  await assert.rejects(store.listLocations(), store.StoreCorruptError);
  await assert.rejects(
    store.addLocation({ name: "X", country: "Y", lat: 1, lon: 1 }),
    store.StoreCorruptError,
  );
  assert.equal(await fs.readFile(dataFile, "utf8"), "{ not json");
});

test.after(() => fs.rm(tmpDir, { recursive: true, force: true }));
