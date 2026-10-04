import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(
  new URL("../app/care/[clinicSlug]/[doctorSlug]/page.tsx", import.meta.url),
  "utf8",
);

test("doctor profile keeps availability visible when the 7-day preview is empty", () => {
  const start = page.indexOf('<section className="atlas-care-availability"');
  const end = page.indexOf('<Link className="button button-ghost atlas-care-profile-back"', start);
  assert.ok(start >= 0);
  assert.ok(end > start);

  const availability = page.slice(start, end);
  assert.match(availability, /slotError/);
  assert.match(availability, /copy\.availabilityUnavailable/);
  assert.match(availability, /copy\.noPreviewTimes/);
  assert.match(availability, /copy\.noPreviewTimesHelp/);
  assert.match(availability, /\/times/);
  assert.doesNotMatch(page, /\{slotGroups\.length \? \(\s*<section className="atlas-care-availability"/);
});

test("empty and unavailable availability states are patient-facing in every Atlas Patient language", () => {
  assert.match(page, /No open times in the next 7 days\./);
  assert.match(page, /لە حەوت ڕۆژی داهاتوودا هیچ کاتێکی بەردەست نییە\./);
  assert.match(page, /د حەفت ڕۆژێن داهاتی دا چ دەمەکێ بەردەست نینە\./);
  assert.match(page, /ماكو أوقات متاحة خلال الأيام السبعة الجاية\./);
  assert.match(page, /Open times are temporarily unavailable\./);
});
