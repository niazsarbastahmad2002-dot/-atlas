import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/care/[clinicSlug]/[doctorSlug]/times/page.tsx", import.meta.url), "utf8");

test("patient sees read-only availability when verified booking is not ready", () => {
  assert.match(page, /groups\.length \? \(bookingReady \? t\.title : t\.readOnlyTitle\) : t\.noTimes/);
  assert.match(page, /groups\.length \? <p className="hero-copy"/);
  assert.match(page, /\{bookingReady \? t\.intro : t\.readOnlyIntro\}/);
  for (const title of ["Available times", "کاتە بەردەستەکان", "دەمێن بەردەست", "الأوقات المتاحة"]) {
    assert.ok(page.includes(title));
  }
});

test("no-slots page shows an honest title without duplicate empty copy", () => {
  assert.ok(page.includes(" : t.noTimes}</h1>"));
  assert.doesNotMatch(page, /<strong>\{t\.noTimes\}<\/strong>/);
});

test("a prominent call action only appears for a public phone and nonbookable times", () => {
  assert.match(page, /!bookingReady && phone && groups\.length/);
  assert.match(page, /atlas-times-call-primary/);
  assert.match(page, /@media\(max-width:620px\)\{\.atlas-times-call-primary/);
});

test("real availability and booking launch gate stay authoritative", () => {
  assert.match(page, /list_public_doctor_slots_page/);
  assert.match(page, /ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED === "true"/);
  assert.match(page, /readiness\.supabasePhoneEnabled/);
  assert.match(page, /className="atlas-time-option is-readonly"/);
  assert.match(page, /patientLocaleHref\(`\/care\/\$\{clinicSlug\}\/\$\{doctorSlug\}\/book`/);
  assert.doesNotMatch(page, /\.from\("appointments"\)|patient_phone|clinic_members/);
});
