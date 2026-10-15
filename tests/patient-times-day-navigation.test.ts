import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/care/[clinicSlug]/[doctorSlug]/times/page.tsx", import.meta.url), "utf8");
const groupHelper = readFileSync(new URL("../lib/patient-appointment-availability.ts", import.meta.url), "utf8");

test("Patient selects from real published dates using native accessible panels", () => {
  assert.match(page, /groups\.map\(\(group, index\) => \(/);
  assert.match(page, /<details[^>]*name="atlas-times-day" open=\{index === 0\}/);
  assert.match(page, /<summary>/);
  assert.match(page, /group\.dateLabel/);
  assert.match(page, /localizeDigits\(group\.slots\.length, locale\)/);
  assert.match(page, /min-height:58px/);
  assert.match(page, /:focus-visible\{outline:/);
  assert.match(page, /@media\(max-width:620px\)/);
});

test("date selection is translated across English, Sorani, Badini and Arabic", () => {
  for (const label of ["Choose a day", "ڕۆژێک هەڵبژێرە", "ڕۆژەکێ هەلبژێرە", "اختار يوم"]) {
    assert.ok(page.includes(label));
  }
});

test("date panels are built only from genuine future RPC slots, never placeholder availability", () => {
  assert.match(page, /list_public_doctor_slots_page/);
  assert.match(page, /groupPublicAppointmentTimes\(slotData, locale\)/);
  assert.match(groupHelper, /const days = new Map/);
  assert.match(groupHelper, /instant <= now/);
  assert.match(page, /ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED === "true"/);
  assert.match(page, /readiness\.supabasePhoneEnabled/);
  assert.match(page, /className="atlas-time-option is-readonly"/);
  assert.doesNotMatch(page, /\.from\("appointments"\)|clinic_members|service_role/);
});
