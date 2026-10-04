import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const patientPages = [
  "app/care/page.tsx",
  "app/care/[clinicSlug]/page.tsx",
  "app/care/[clinicSlug]/[doctorSlug]/page.tsx",
  "app/care/[clinicSlug]/[doctorSlug]/times/page.tsx",
  "app/care/[clinicSlug]/[doctorSlug]/book/page.tsx",
];

test("Atlas Patient navigation is shared across the full care journey", () => {
  const nav = source("app/care/patient-nav.tsx");
  assert.match(nav, /href="\/care"/);
  assert.match(nav, />Patient<\/span>/);
  assert.match(nav, /const href = actionHref \?\? \`\/patient-account\?lang=\$\{locale\}\`/);
  assert.match(nav, /href=\{href\}/);

  for (const path of patientPages) {
    const page = source(path);
    assert.match(page, /AtlasPatientNav/);
  }
});

test("clinic, doctor, times, and booking keep My appointments localized", () => {
  for (const path of patientPages.slice(1)) {
    const page = source(path);
    assert.match(page, /myAppointments: "My appointments"/);
    assert.match(page, /myAppointments: "مەوعیدەکانم"/);
    assert.match(page, /myAppointments: "وادەیێن من"/);
    assert.match(page, /myAppointments: "مواعيدي"/);
  }
});

test("patient-facing booking language avoids provider and production jargon", () => {
  const doctor = source("app/care/[clinicSlug]/[doctorSlug]/page.tsx");
  const times = source("app/care/[clinicSlug]/[doctorSlug]/times/page.tsx");
  const booking = source("app/care/[clinicSlug]/[doctorSlug]/book/page.tsx");

  assert.doesNotMatch(doctor, /online self-booking is not enabled yet|production phone verification/i);
  assert.doesNotMatch(times, /public schedule|finalized/i);
  assert.doesNotMatch(booking, /production phone verification/i);
  assert.match(booking, /online booking is not ready yet/i);
});

test("real availability and booking readiness remain authoritative", () => {
  const doctor = source("app/care/[clinicSlug]/[doctorSlug]/page.tsx");
  const times = source("app/care/[clinicSlug]/[doctorSlug]/times/page.tsx");
  const booking = source("app/care/[clinicSlug]/[doctorSlug]/book/page.tsx");

  assert.match(doctor, /list_public_doctor_slots/);
  assert.match(times, /list_public_doctor_slots_page/);
  assert.match(booking, /list_public_doctor_slots/);
  assert.match(doctor, /ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED === "true"/);
  assert.match(times, /ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED === "true"/);
  assert.match(booking, /ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED === "true"/);
  for (const page of [doctor, times, booking]) {
    assert.match(page, /readiness\.supabasePhoneEnabled/);
    assert.match(page, /!readiness\.signupDisabled/);
  }
});

test("Atlas Patient journey never reads private clinic operations directly", () => {
  for (const path of patientPages) {
    const page = source(path);
    assert.doesNotMatch(
      page,
      /\.from\("appointments"\)|\.from\("clinic_members"\)|patient_phone|patient_name|reminder_/,
    );
  }
});
