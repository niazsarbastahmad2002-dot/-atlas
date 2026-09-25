import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("new appointment time floor follows live Baghdad clinic time", () => {
  const source = readFileSync(
    new URL("../app/dashboard/appointment-time-field-v2.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /timeZone: "Asia\/Baghdad"/);
  assert.match(source, /const fiveMinutesFromNow = addLocalMinutes\(baghdadLocalMinute\(new Date\(\)\), 5\)/);
  assert.match(source, /window\.setInterval\(refreshMinimum, 30_000\)/);
  assert.match(source, /const effectiveMin = liveMin > min \? liveMin : min/);
  assert.match(source, /candidate >= effectiveMin && candidate <= max/);
  assert.match(source, /candidate < effectiveMin \|\| candidate > max/);
});
