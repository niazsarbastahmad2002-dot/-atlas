import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/care/[clinicSlug]/[doctorSlug]/page.tsx", import.meta.url), "utf8");

test("Doctor profile shows clinic identity and real availability before long details", () => {
  const clinic = page.indexOf('className="atlas-care-profile-clinic-link"');
  const available = page.indexOf('<section className="atlas-care-availability"');
  const bio = page.indexOf('{profile.bio ?');
  const details = page.indexOf('<dl className="atlas-care-profile-details">');
  assert.ok(clinic > -1 && available > clinic && bio > available && details > bio);
  // The bio/details must remain outside the availability condition (including zero-slot profiles).
  assert.match(page, /<\/section>\s*\) : null\}\s*\{profile\.bio \?/);
  assert.match(page, /\{copy\.clinic\}: \{profile\.clinic_name\}/);
  assert.match(page, /min-height:44px/);
});

test("Doctor profile remains localized and makes no claim of invented availability", () => {
  assert.match(page, /list_public_doctor_slots/);
  assert.match(page, /slotGroups\.length > 0 \|\| laterSlotAvailable/);
  assert.match(page, /slotError \? \(/);
  assert.match(page, /ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED === "true"/);
  assert.match(page, /patientLocaleHref\(`\/care\/\$\{profile\.clinic_slug\}`, locale\)/);
  assert.doesNotMatch(page, /fakeDoctor|doctor\.photo|\.from\("appointments"\)|patient_phone|clinic_members/);
});

test("Patient doctor page keeps normal booking/phone availability controls", () => {
  assert.match(page, /bookingReady \? \(/);
  assert.match(page, /className="atlas-care-slot-book"/);
  assert.match(page, /copy\.callToReserve/);
  assert.match(page, /copy\.allTimes/);
});
