import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const clinic = read("app/care/[clinicSlug]/page.tsx");
const doctor = read("app/care/[clinicSlug]/[doctorSlug]/page.tsx");
const times = read("app/care/[clinicSlug]/[doctorSlug]/times/page.tsx");
const hero = read("app/care/patient-profile-hero.tsx");
const css = read("app/care/patient-profile-design.css");

test("Patient clinic, doctor, and time pages share one display-only hero", () => {
  for (const page of [clinic, doctor, times]) {
    assert.match(page, /PatientProfileHero/);
    assert.match(page, /atlas-patient-detail/);
  }
  assert.match(hero, /kind: "clinic" \| "doctor" \| "times"/);
  assert.match(hero, /<h1><bdi>\{title\}<\/bdi><\/h1>/);
  assert.doesNotMatch(hero, /<img|fakePhoto/i);
});

test("Patient profiles support tablet, phone, contrast and larger touch targets", () => {
  assert.match(css, /@media\(max-width:860px\)/);
  assert.match(css, /@media\(max-width:680px\)/);
  assert.match(css, /min-height:56px/);
  assert.match(css, /focus-visible/);
  assert.match(css, /color:#fff!important/);
});

test("Care profiles keep only existing published data and honest empty states", () => {
  assert.match(clinic, /get_public_clinic_profile/);
  assert.match(clinic, /list_public_doctors/);
  assert.match(clinic, /copy\.noDoctors/);
  assert.match(doctor, /get_public_doctor_profile/);
  assert.match(doctor, /list_public_doctor_slots/);
  assert.match(times, /list_public_doctor_slots_page/);
  for (const page of [doctor, times]) {
    assert.match(page, /ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED === "true"/);
    assert.match(page, /readiness\.supabasePhoneEnabled/);
  }
});
