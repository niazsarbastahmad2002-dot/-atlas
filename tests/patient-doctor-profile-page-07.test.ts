import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Focused source-level regression guards for the published Atlas Patient doctor page.
// Runtime slot values still come exclusively from Supabase's public doctor-slot RPC.
const source = readFileSync(
  new URL("../app/care/[clinicSlug]/[doctorSlug]/page.tsx", import.meta.url),
  "utf8",
);

test("doctor profile uses published-only data and keeps public booking gated", () => {
  assert.match(source, /supabase\.rpc\("get_public_doctor_profile"/);
  assert.match(source, /supabase\.rpc\("list_public_doctor_slots"/);
  assert.match(source, /const bookingReady = Boolean\(/);
  assert.match(source, /ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED/);
  assert.match(source, /group\.times\.map\(\(time\) => bookingReady \? \(/);
  assert.match(source, /<span key=\{time\.slotAt\} dir="auto">\{time\.label\}<\/span>/);
});

test("availability remains visible when there are no slots or the RPC fails", () => {
  assert.match(source, /<section className="atlas-care-availability"/);
  assert.match(source, /slotError \? \(/);
  assert.match(source, /copy\.availabilityUnavailable/);
  assert.match(source, /copy\.noPreviewTimes/);
  assert.doesNotMatch(source, /\{\(slotError \|\| slotGroups\.length > 0/);
  assert.doesNotMatch(source, /list_public_doctor_slots_page/);
});

test("directions require a clinic street address rather than an approximate city", () => {
  assert.match(source, /const directionsDestination = profile\.address_text\s*\?/);
  assert.match(source, /const directionsUrl = directionsDestination\s*\?/);
  assert.match(source, /new URLSearchParams\(\{ api: "1", destination: directionsDestination \}\)/);
  assert.match(source, /directionsUrl \? \(/);
  assert.match(source, /target="_blank" rel="noreferrer"/);
});

test("patient identity and detail labels remain localized to four supported languages", () => {
  assert.equal((source.match(/    directions: "/g) ?? []).length, 4);
  assert.equal((source.match(/    about: "/g) ?? []).length, 4);
  assert.match(source, /<PatientProfileHero kind="doctor"/);
  assert.match(source, /\{profile\.bio \? \(/);
  assert.match(source, /<bdi>\{profile\.doctor_name\}<\/bdi>|title=\{profile\.doctor_name\}/);
  assert.match(source, /patientLocaleHref\(\`\/care\/\$\{profile\.clinic_slug\}\`, locale\)/);
});
