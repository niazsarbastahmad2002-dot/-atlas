import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/history/history-client.tsx", import.meta.url), "utf8");

test("appointment history can match phone digits without display spacing", () => {
  assert.match(source, /const digits = needle\.replace\(\/\[\^0-9\]\/g, ""\)/);
  assert.match(source, /digits\.length >= 4/);
  assert.match(source, /row\.patientPhone\.replace\(\/\[\^0-9\]\/g, ""\)\.includes\(digits\)/);
});
