import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("appointment editor expires at its boundary without per-row polling", () => {
  const source = readFileSync(
    new URL("../app/dashboard/appointment-editor.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /const \[now, setNow\] = useState\(\(\) => Date\.now\(\)\)/);
  assert.match(source, /const expiresAt = new Date\(appointmentAt\)\.getTime\(\) \+ 60_000/);
  assert.match(source, /document\.hidden/);
  assert.match(source, /window\.setTimeout\(syncVisibility/);
  assert.match(source, /window\.clearTimeout\(timer\)/);
  assert.doesNotMatch(source, /window\.setInterval\(/);
  assert.match(source, /document\.addEventListener\("visibilitychange", syncVisibility\)/);
  assert.match(source, /new Date\(appointmentAt\)\.getTime\(\) >= now - 60_000/);
  assert.match(source, /statusEditable && \(open \|\| withinEditWindow\)/);
});
