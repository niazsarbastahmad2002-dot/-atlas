import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8");

test("daily schedule discloses whenever the returned view is incomplete", () => {
  assert.match(source, /const DAILY_SCHEDULE_VIEW_LIMIT = 500/);
  assert.match(source, /count: appointmentCount/);
  assert.match(source, /\{ count: "exact" \}/);
  assert.match(source, /\.limit\(DAILY_SCHEDULE_VIEW_LIMIT\)/);
  assert.match(source, /const scheduleTruncated = appointmentCount !== null && appointmentCount > rows\.length/);
  assert.match(source, /scheduleTruncated \? <p className="notice workspace-notice" role="status">/);
  assert.match(source, /days\.limited\.replaceAll\("\{count\}", localizeDigits\(rows\.length, locale\)\)/);
});

test("future occupied slots page through the existing bounded booking horizon", () => {
  assert.match(source, /const OCCUPIED_SLOT_PAGE_SIZE = 500/);
  assert.match(source, /const OCCUPIED_SLOT_VIEW_LIMIT = 5000/);
  assert.match(source, /for \(let from = 0; from < OCCUPIED_SLOT_VIEW_LIMIT; from \+= OCCUPIED_SLOT_PAGE_SIZE\)/);
  assert.match(source, /\.lte\("appointment_at", bookingHorizonEnd\.toISOString\(\)\)/);
  assert.match(source, /\.order\("appointment_at", \{ ascending: true \}\)[\s\S]*\.order\("id", \{ ascending: true \}\)[\s\S]*\.range\(from, to\)/);
  assert.match(source, /if \(page\.length < OCCUPIED_SLOT_PAGE_SIZE\) break/);
  assert.match(source, /loadOccupiedAppointments\(\)/);
});
