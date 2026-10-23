import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/care/[clinicSlug]/[doctorSlug]/times/page.tsx", import.meta.url), "utf8");

test("patient clearly sees published times are not booked or confirmed", () => {
  assert.match(page, /title=\{bookingReady \? t\.title : t\.readOnlyTitle\}/);
  assert.match(page, /bookingReady \? t\.intro : t\.readOnlyIntro/);
  for (const copy of [
    "These times are not reserved.",
    "ئەم کاتانە بۆ تۆ نەگیراون.",
    "ئەڤ دەمە بۆ تە نەهاتینە گرتن.",
    "هذه الأوقات ليست محجوزة إلك.",
  ]) {
    assert.ok(page.includes(copy));
  }
  assert.match(page, /atlas-times-unreserved/);
});

test("no-times is distinct from a public availability load failure", () => {
  assert.match(page, /groups\.length \? \(/);
  assert.match(page, /<section className="atlas-times-empty" role="status">/);
  assert.match(page, /<h2>\{t\.noTimes\}<\/h2>/);
  assert.match(page, /firstSlotPage\.error/);
  assert.match(page, /slotLoadFailed/);
  assert.match(page, /title=\{t\.loadErrorTitle\} help=\{t\.loadErrorHelp\}/);
});

test("read-only phone action requires a published clinic number and does not book", () => {
  assert.match(page, /!bookingReady && phone \? \(/);
  assert.match(page, /atlas-times-call-primary/);
  assert.match(page, /@media\(max-width:620px\)/);
  assert.match(page, /className="atlas-time-option is-readonly"/);
});

test("published availability and the existing phone-ready booking launch gate stay authoritative", () => {
  assert.match(page, /list_public_doctor_slots_page/);
  assert.match(page, /ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED === "true"/);
  assert.match(page, /readiness\.supabasePhoneEnabled/);
  assert.match(page, /!readiness\.signupDisabled/);
  assert.match(page, /href=\{patientLocaleHref\(`\/care\/\$\{clinicSlug\}\/\$\{doctorSlug\}\/book`, locale, \{ slot: slot\.slotAt \}\)\}/);
  assert.doesNotMatch(page, /\.from\("appointments"\)|patient_phone|clinic_members/);
});
