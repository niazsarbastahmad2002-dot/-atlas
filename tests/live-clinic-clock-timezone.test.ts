import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = () => readFileSync(new URL("../app/dashboard/live-clinic-clock.tsx", import.meta.url), "utf8");

test("live clinic clock always renders the Baghdad clinic timezone", () => {
  const clock = source();
  const timezoneUses = clock.match(/timeZone: "Asia\/Baghdad"/g) ?? [];

  assert.ok(timezoneUses.length >= 3);
  assert.match(clock, /new Intl\.DateTimeFormat\("en-GB",[\s\S]*hourCycle: "h23"/);
  assert.match(clock, /baghdadHour < 12/);
  assert.doesNotMatch(clock, /now\.getHours\(\)/);
});


test("live clinic clock pauses in background and resyncs when Atlas becomes visible", () => {
  const clock = source();

  assert.match(clock, /document\.visibilityState !== "visible"/);
  assert.match(clock, /document\.addEventListener\("visibilitychange", syncVisibility\)/);
  assert.match(clock, /document\.removeEventListener\("visibilitychange", syncVisibility\)/);
  assert.match(clock, /if \(timer === null\) timer = window\.setInterval\(update, 1_000\)/);
  assert.match(clock, /window\.clearInterval\(timer\)/);
});
