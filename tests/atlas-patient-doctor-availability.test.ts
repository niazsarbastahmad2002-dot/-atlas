import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(
  new URL("../app/care/[clinicSlug]/[doctorSlug]/page.tsx", import.meta.url),
  "utf8",
);

test("doctor profile probes only days 8-14 when the 7-day preview is empty", () => {
  assert.match(page, /if \(!slotError && slotGroups\.length === 0\)/);
  assert.match(page, /"list_public_doctor_slots_page"/);
  assert.match(page, /p_from_date: baghdadDateKeyAfterDays\(7\)/);
  assert.match(page, /p_days: 7/);
  assert.match(page, /p_limit: 1/);
  assert.match(page, /laterSlotAvailable = !laterSlotError && Array\.isArray\(laterSlotData\) && laterSlotData\.length > 0/);
});

test("doctor profile only advertises later times when real availability proves they exist", () => {
  assert.match(page, /\(slotError \|\| slotGroups\.length > 0 \|\| laterSlotAvailable\) \? \(/);
  assert.match(page, /copy\.noPreviewTimes/);
  assert.match(page, /copy\.noPreviewTimesHelp/);
  assert.ok(page.includes('href={`/care/${clinicSlug}/${doctorSlug}/times`}'));
  assert.match(page, /!slotError \? \(/);
  assert.doesNotMatch(page, /\{slotGroups\.length \? \(\s*<section className="atlas-care-availability"/);
});

test("slot lookup failures stay distinct from a legitimate later-availability gap", () => {
  assert.match(page, /slotError\s*\? copy\.availabilityUnavailableHelp/);
  assert.match(page, /copy\.availabilityUnavailable/);
  assert.match(page, /\(!slotError \|\| phone\) \? \(/);
});

test("empty and unavailable availability states are patient-facing in every Atlas Patient language", () => {
  assert.match(page, /No open times in the next 7 days\./);
  assert.match(page, /لە حەوت ڕۆژی داهاتوودا هیچ کاتێکی بەردەست نییە\./);
  assert.match(page, /د حەفت ڕۆژێن داهاتی دا چ دەمەکێ بەردەست نینە\./);
  assert.match(page, /ماكو أوقات متاحة خلال الأيام السبعة الجاية\./);
  assert.match(page, /Open times are temporarily unavailable\./);
  assert.match(page, /کاتە بەردەستەکان ئێستا نیشان نادرێن\./);
});
