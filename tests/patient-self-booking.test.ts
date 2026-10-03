import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("patient booking verification does not persist a clinic auth session", () => {
  const client = source("lib/supabase/verification-client.ts");
  const form = source("app/care/[clinicSlug]/[doctorSlug]/book/booking-form.tsx");

  assert.match(client, /persistSession: false/);
  assert.match(client, /autoRefreshToken: false/);
  assert.match(client, /detectSessionInUrl: false/);
  assert.match(form, /createEphemeralVerificationClient/);
  assert.doesNotMatch(form, /createClient\(\).*@\/lib\/supabase\/client/);
});

test("patient booking verifies phone through Supabase before finalization", () => {
  const form = source("app/care/[clinicSlug]/[doctorSlug]/book/booking-form.tsx");

  assert.match(form, /signInWithOtp\(\{/);
  assert.match(form, /shouldCreateUser: true/);
  assert.match(form, /verifyOtp\(\{/);
  assert.match(form, /type: "sms"/);
  assert.match(form, /Authorization: \`Bearer \$\{accessToken\}\`/);
  assert.match(form, /\/api\/care\/booking\/finalize/);
});

test("booking API trusts the verified auth identity, not a submitted phone", () => {
  const route = source("app/api/care/booking/finalize/route.ts");

  assert.match(route, /admin\.auth\.getUser\(token\)/);
  assert.match(route, /user\.phone_confirmed_at/);
  assert.match(route, /iraqiPhonePattern\.test\(verifiedPhone\)/);
  assert.doesNotMatch(route, /patientPhone\?: unknown/);
  assert.doesNotMatch(route, /body\.patientPhone/);
  assert.match(route, /finalize_verified_public_booking_service/);
});

test("verified booking is rate limited and returns only a fresh private patient path", () => {
  const route = source("app/api/care/booking/finalize/route.ts");

  assert.match(route, /consume_patient_link_rate_limit/);
  assert.match(route, /public-booking:\$\{user\.id\}/);
  assert.match(route, /createPatientToken\(\)/);
  assert.match(route, /hashPatientToken\(patientToken\)/);
  assert.match(route, /patientPath: \`\/patient\/\$\{patientToken\}/);
  assert.doesNotMatch(route, /patient_phone|clinic_members/);
});

test("self-booking stays dormant until both launch and provider readiness are true", () => {
  const doctor = source("app/care/[clinicSlug]/[doctorSlug]/page.tsx");
  const bookingPage = source("app/care/[clinicSlug]/[doctorSlug]/book/page.tsx");
  const route = source("app/api/care/booking/finalize/route.ts");
  const env = source(".env.example");

  assert.match(doctor, /ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED === "true"/);
  assert.match(doctor, /readiness\.supabasePhoneEnabled/);
  assert.match(bookingPage, /ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED === "true"/);
  assert.match(bookingPage, /readiness\.supabasePhoneEnabled/);
  assert.match(route, /ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED !== "true"/);
  assert.match(env, /ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED=false/);
});

test("verified patient booking never grants clinic membership", () => {
  const form = source("app/care/[clinicSlug]/[doctorSlug]/book/booking-form.tsx");
  const route = source("app/api/care/booking/finalize/route.ts");
  const migration = source("supabase/migrations/20261003201343_verified_public_booking_patient_link.sql");

  for (const value of [form, route, migration]) {
    assert.doesNotMatch(value, /clinic_members|redeem_staff_invite|assigned_doctor_id/);
  }
});
