import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20261003192500_verified_public_self_booking.sql", import.meta.url),
  "utf8",
);

test("public booking verification is isolated from staff/login OTP challenges", () => {
  assert.match(migration, /private\.public_booking_verifications/);
  assert.doesNotMatch(migration, /private\.whatsapp_auth_challenges/);
  assert.match(migration, /v_phone_count >= 6/);
  assert.match(migration, /v_ip_count >= 20/);
  assert.match(migration, /v_row\.attempts >= 5|v_verification/);
});

test("self-booking functions are service-role only", () => {
  assert.match(migration, /\(select auth\.role\(\)\) <> 'service_role'/);
  assert.match(migration, /revoke all on function public\.create_verified_public_booking_service[\s\S]*from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.create_verified_public_booking_service[\s\S]*to service_role/);
  assert.doesNotMatch(migration, /to anon, authenticated[\s\S]*create_verified_public_booking_service/);
});

test("final booking revalidates the full public slot contract", () => {
  assert.match(migration, /c\.is_published/);
  assert.match(migration, /d\.is_published/);
  assert.match(migration, /core_doctor\.active/);
  assert.match(migration, /settings\.enabled/);
  assert.match(migration, /doctor_public_booking_hours/);
  assert.match(migration, /doctor_public_booking_closed_dates/);
  assert.match(migration, /v_min_lead/);
  assert.match(migration, /v_horizon/);
  assert.match(migration, /mod\([\s\S]*v_interval \* 60/);
  assert.match(migration, /a\.status in \('pending', 'confirmed'\)/);
});

test("verified public bookings use ordinary appointments and issue a private patient token", () => {
  assert.match(migration, /insert into public\.appointments/);
  assert.match(migration, /'pending'/);
  assert.match(migration, /idempotency_key/);
  assert.match(migration, /insert into private\.patient_appointment_tokens/);
  assert.match(migration, /created_by,[\s\S]*null/);
  assert.match(migration, /set consumed_at = now\(\)/);
});

test("self-booking never grants clinic membership or creates an auth user", () => {
  assert.doesNotMatch(migration, /clinic_members/);
  assert.doesNotMatch(migration, /auth\.users/);
  assert.doesNotMatch(migration, /insert into auth\./);
});
