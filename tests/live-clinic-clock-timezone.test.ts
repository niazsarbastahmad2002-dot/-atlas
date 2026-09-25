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
