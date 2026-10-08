import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/care/[clinicSlug]/[doctorSlug]/times/page.tsx", import.meta.url), "utf8");

test("Patient can jump to a real available day without extra typing", () => {
  assert.match(page, /groups\.length > 1 \? \(/);
  assert.match(page, /<nav className="atlas-times-day-jump" aria-label=\{t\.jumpToDay\}>/);
  assert.match(page, /groups\.map\(\(group\) => \(/);
  assert.ok(page.includes('href={`#atlas-day-${group.dateKey}`}'));
  assert.ok(page.includes('id={`atlas-day-${group.dateKey}`}'));
  assert.match(page, /scroll-snap-type:x proximity/);
  assert.match(page, /overflow-x:auto/);
  assert.match(page, /min-height:48px/);
  assert.match(page, /:focus-visible\{outline:/);
});

test("jump-to-day label is available in English, Sorani, Badini and Arabic", () => {
  for (const label of ['Jump to day', 'بڕۆ بۆ ڕۆژ', 'بڕۆ بۆ ڕۆژێ', 'اختر اليوم']) {
    assert.ok(page.includes(label));
  }
});

test("only legitimate published schedule dates create day links; no fake booking actions", () => {
  assert.match(page, /list_public_doctor_slots_page/);
  assert.match(page, /group = \{ dateKey: parts\.dateKey, dateLabel: parts\.dateLabel, slots: \[\] \}/);
  assert.match(page, /ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED === "true"/);
  assert.match(page, /readiness\.supabasePhoneEnabled/);
  assert.match(page, /className="atlas-time-option is-readonly"/);
  assert.doesNotMatch(page, /\.from\("appointments"\)|clinic_members|service_role/);
});
