import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8");

test("daily schedule discloses when the bounded appointment query is truncated", () => {
  assert.match(source, /const DAILY_SCHEDULE_VIEW_LIMIT = 500/);
  assert.match(source, /count: appointmentCount/);
  assert.match(source, /\{ count: "exact" \}/);
  assert.match(source, /\.limit\(DAILY_SCHEDULE_VIEW_LIMIT\)/);
  assert.match(source, /const scheduleTruncated = \(appointmentCount \?\? rows\.length\) > DAILY_SCHEDULE_VIEW_LIMIT/);
  assert.match(source, /scheduleTruncated \? <p className="notice workspace-notice" role="status">/);
  assert.match(source, /days\.limited\.replaceAll\("\{count\}", localizeDigits\(DAILY_SCHEDULE_VIEW_LIMIT, locale\)\)/);
});
