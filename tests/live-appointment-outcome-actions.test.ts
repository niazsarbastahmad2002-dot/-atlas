import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("appointment outcome controls refresh while receptionist leaves schedule open", () => {
  const source = readFileSync(
    new URL("../app/dashboard/appointment-actions.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /setClockTick/);
  assert.match(source, /window\.setInterval\(\(\) => setClockTick\(\(tick\) => tick \+ 1\), 30_000\)/);
  assert.match(source, /window\.clearInterval\(timer\)/);
  assert.match(source, /scheduledAt > Date\.now\(\) \+ 5 \* 60 \* 1000/);
});
