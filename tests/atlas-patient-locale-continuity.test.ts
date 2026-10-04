import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const care = source("app/care/page.tsx");
const clinic = source("app/care/[clinicSlug]/page.tsx");
const doctor = source("app/care/[clinicSlug]/[doctorSlug]/page.tsx");
const times = source("app/care/[clinicSlug]/[doctorSlug]/times/page.tsx");
const booking = source("app/care/[clinicSlug]/[doctorSlug]/book/page.tsx");
const localeHelper = source("app/care/patient-locale.ts");

test("Atlas Patient care routes prefer an explicit supported language before the cookie", () => {
  assert.match(localeHelper, /typeof value === "string" && isUiLocale\(value\)/);
  assert.match(localeHelper, /return getUiLocale\(\)/);

  for (const page of [care, clinic, doctor, times, booking]) {
    assert.match(page, /resolvePatientLocale\(/);
  }

  assert.match(care, /resolvePatientLocale\(params\.lang\)/);
  assert.match(clinic, /resolvePatientLocale\(query\.lang\)/);
  assert.match(doctor, /resolvePatientLocale\(query\.lang\)/);
  assert.match(times, /resolvePatientLocale\(query\.lang\)/);
  assert.match(booking, /resolvePatientLocale\(query\.lang\)/);
});

test("Patient discovery keeps language through search and navigation", () => {
  assert.match(care, /name="lang" value=\{locale\}/);
  assert.match(care, /patientLocaleHref\("\/care", locale, \{ sort: "soonest" \}\)/);
  assert.match(care, /patientLocaleHref\(`\/care\/\$\{doctor\.clinic_slug\}\/\$\{doctor\.doctor_slug\}`, locale\)/);
  assert.match(care, /patientLocaleHref\("\/patient-account", locale\)/);
  assert.match(clinic, /patientLocaleHref\(`\/care\/\$\{clinicSlug\}\/\$\{doctor\.slug\}`, locale\)/);
  assert.match(doctor, /patientLocaleHref\(`\/care\/\$\{profile\.clinic_slug\}`, locale\)/);
});

test("Times and booking keep language together with the selected live slot", () => {
  assert.match(doctor, /patientLocaleHref\(`\/care\/\$\{clinicSlug\}\/\$\{doctorSlug\}\/book`, locale, \{ slot: time\.slotAt \}\)/);
  assert.match(times, /patientLocaleHref\(`\/care\/\$\{clinicSlug\}\/\$\{doctorSlug\}\/book`, locale, \{ slot: slot\.slotAt \}\)/);
  assert.match(times, /const doctorHref = safeSlug/);
  assert.match(booking, /const doctorHref = safeSlug/);
  assert.match(booking, /href=\{doctorHref\}/);
});

test("Locale continuity stays UI-only and does not change booking readiness", () => {
  assert.match(doctor, /ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED/);
  assert.match(times, /ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED/);
  assert.match(booking, /ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED/);
  assert.doesNotMatch(localeHelper, /supabase|service_role|auth|booking/i);
});
