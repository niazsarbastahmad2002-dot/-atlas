import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const card = read("app/care/patient-directory-card.tsx");
const hero = read("app/care/patient-profile-hero.tsx");
const clinic = read("app/care/[clinicSlug]/page.tsx");
const doctor = read("app/care/[clinicSlug]/[doctorSlug]/page.tsx");
const times = read("app/care/[clinicSlug]/[doctorSlug]/times/page.tsx");
const account = read("app/patient-account/page.tsx");

test("public card names and clinic locations isolate Latin names in Kurdish or Arabic layouts", () => {
  assert.match(card, /<h3><bdi>\{doctor\.doctor_name\}<\/bdi><\/h3>/);
  assert.match(card, /<bdi>\{doctor\.specialty\}/);
  assert.match(card, /<bdi>\{doctor\.clinic_name\}<\/bdi>/);
  assert.match(card, /<bdi>\{location\}<\/bdi>/);
  assert.match(card, /patientLocaleHref\(/);
});

test("clinic and doctor profiles preserve layout direction without changing published identities", () => {
  assert.match(hero, /<h1><bdi>\{title\}<\/bdi><\/h1>/);
  assert.match(hero, /<p><bdi>\{subtitle\}<\/bdi><\/p>/);
  assert.match(clinic, /<bdi>\{doctor\.display_name\}<\/bdi>/);
  assert.match(clinic, /<bdi>\{location\}<\/bdi>/);
  assert.match(doctor, /<bdi>\{profile\.clinic_name\}<\/bdi>/);
  assert.match(doctor, /<bdi>\{profile\.specialty\}<\/bdi>/);
  assert.match(doctor, /get_public_doctor_profile/);
  assert.match(clinic, /get_public_clinic_profile/);
});

test("real availability and private Patient account text keep their authorization paths", () => {
  assert.match(times, /<bdi>\{profile\.doctor_name\}<\/bdi>/);
  assert.match(times, /<bdi>\{profile\.clinic_name\}<\/bdi>/);
  assert.match(times, /list_public_doctor_slots_page/);
  assert.match(account, /<bdi>\{session\.display_name\}<\/bdi>/);
  assert.match(account, /<bdi>\{appointment\.doctor_name\}<\/bdi>/);
  assert.match(account, /<bdi>\{appointment\.clinic_name\}<\/bdi>/);
  assert.match(account, /resolvePatientAccountSession\(admin, rawSession\)/);
  assert.match(account, /list_patient_account_appointments_service/);
  assert.match(account, /robots: \{ index: false, follow: false \}/);
  assert.doesNotMatch(account, /\.from\("appointments"\)/);
});
