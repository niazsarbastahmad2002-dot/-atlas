import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = source("app/patient-account/page.tsx");
const nav = source("app/care/patient-nav.tsx");

test("My Appointments is part of the shared Atlas Patient experience", () => {
  assert.match(page, /AtlasPatientNav/);
  assert.match(page, /actionLabel=\{t\.findCare\}/);
  assert.match(page, /actionHref="\/care"/);
  assert.match(nav, /actionLabel\?: string/);
  assert.match(nav, /actionHref\?: string/);
  assert.match(nav, /const href = actionHref \?\? \`\/patient-account\?lang=\$\{locale\}\`/);
  assert.match(nav, /dir=\{locale === "en" \? "ltr" : "rtl"\}/);
});

test("appointments stay ahead of secondary profile editing", () => {
  const appointments = page.indexOf('<section className="patient-account-appointments"');
  const profile = page.indexOf('<section className="patient-account-profile"');
  assert.ok(appointments >= 0);
  assert.ok(profile > appointments);
});

test("patient account copy is short and patient-facing across Atlas languages", () => {
  assert.match(page, /intro: "See your appointments and keep your booking details together in one private place\."/);
  assert.match(page, /signInTitle: "Sign in to see your appointments"/);
  assert.match(page, /noAppointments: "No appointments yet\."/);
  assert.match(page, /signInTitle: "بچۆ ژوورەوە بۆ بینینی مەوعیدەکانت"/);
  assert.match(page, /signInTitle: "بچۆ ژوور بۆ دیتنا وادەیێن خۆ"/);
  assert.match(page, /signInTitle: "سجّل الدخول حتى تشوف مواعيدك"/);
  assert.doesNotMatch(page, /without giving access to clinic workspaces|verified self-booked appointments/i);
});

test("Patient home keeps the existing private account authorization boundary", () => {
  assert.match(page, /resolvePatientAccountSession\(admin, rawSession\)/);
  assert.match(page, /admin\.rpc\("list_patient_account_appointments_service"/);
  assert.match(page, /robots: \{ index: false, follow: false \}/);
  assert.doesNotMatch(page, /\.from\("appointments"\)|patient_phone|patient_name|clinic_members/);
});

test("profile editing remains minimal and secondary instead of becoming a patient EMR", () => {
  assert.match(page, /name="display_name"/);
  assert.match(page, /name="preferred_language"/);
  assert.doesNotMatch(page, /name="diagnosis"|name="medical_history"|name="medications"|name="clinical_notes"/i);
});
