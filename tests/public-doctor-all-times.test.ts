import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(
  new URL("../app/care/[clinicSlug]/[doctorSlug]/times/page.tsx", import.meta.url),
  "utf8",
);

test("full public availability uses the same truthful public slot RPC", () => {
  assert.match(page, /get_public_doctor_profile/);
  assert.match(page, /list_public_doctor_slots/);
  assert.match(page, /p_days: 14/);
  assert.doesNotMatch(page, /\.from\("appointments"\)/);
  assert.doesNotMatch(page, /service_role|createAdminClient/);
});

test("public times stay grouped in Baghdad and use Atlas locale formatters", () => {
  assert.match(page, /timeZone: "Asia\/Baghdad"/);
  assert.match(page, /formatLocalDateValue/);
  assert.match(page, /formatTimeValue/);
  assert.match(page, /groups\.find/);
});

test("online booking links remain gated by launch plus real phone readiness", () => {
  assert.match(page, /ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED === "true"/);
  assert.match(page, /readiness\?\.reachable/);
  assert.match(page, /readiness\.supabasePhoneEnabled/);
  assert.match(page, /!readiness\.signupDisabled/);
  assert.match(page, /\/book\?slot=/);
});

test("full availability is mobile-first and preserves 48px slot targets", () => {
  assert.match(page, /atlas-time-option\{min-height:48px/);
  assert.match(page, /@media\(max-width:620px\)/);
  assert.match(page, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test("full availability page is noindex to avoid duplicate dynamic search pages", () => {
  assert.match(page, /robots: \{ index: false, follow: true \}/);
});
