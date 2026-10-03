import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/live-clinic-flow.tsx", import.meta.url), "utf8");

test("live clinic synchronization stops while Atlas is hidden and resyncs on return", () => {
  assert.match(source, /const stop = \(\) => \{[\s\S]*window\.clearInterval\(timer\)/);
  assert.match(source, /document\.visibilityState !== "visible"/);
  assert.match(source, /timer = window\.setInterval\(\(\) => void load\(\), 30_000\)/);
  assert.match(source, /const syncVisibility = \(\) => \{[\s\S]*void load\(\);[\s\S]*start\(\)/);
  assert.match(source, /document\.addEventListener\("visibilitychange", syncVisibility\)/);
  assert.match(source, /document\.removeEventListener\("visibilitychange", syncVisibility\)/);
});
