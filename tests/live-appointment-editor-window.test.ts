import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("appointment editor expires without per-row polling on long-open schedules", () => {
  const source = readFileSync(
    new URL("../app/dashboard/appointment-editor.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /const \[now, setNow\] = useState\(\(\) => Date\.now\(\)\)/);
  assert.match(source, /const expiresAt = new Date\(appointmentAt\)\.getTime\(\) \+ 60_000/);
  assert.match(source, /window\.setTimeout/);
  assert.match(source, /window\.clearTimeout/);
  assert.doesNotMatch(source, /window\.setInterval\(refreshNow, 30_000\)/);
  assert.match(source, /new Date\(appointmentAt\)\.getTime\(\) >= now - 60_000/);
  assert.match(source, /statusEditable && \(open \|\| withinEditWindow\)/);
});
