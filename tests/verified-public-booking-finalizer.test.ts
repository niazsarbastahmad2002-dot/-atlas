import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20261003201343_verified_public_booking_patient_link.sql", import.meta.url),
  "utf8",
);

test("verified public booking finalization is service-role only", () => {
  assert.match(migration, /auth\.role\(\)\) <> 'service_role'/);
  assert.match(migration, /revoke all[\s\S]*from public, anon, authenticated/i);
  assert.match(migration, /grant execute[\s\S]*to service_role/i);
});

test("verified public booking requires a confirmed Iraqi phone identity", () => {
  assert.match(migration, /from auth\.users u/);
  assert.match(migration, /u\.phone_confirmed_at is not null/);
  assert.match(migration, /\^\\\+9647\[0-9\]\{9\}\$/);
  assert.match(migration, /verification_required/);
});

test("verified booking issues the private patient link inside the booking transaction", () => {
  assert.match(migration, /create_public_booking_service/);
  assert.match(migration, /private\.patient_appointment_tokens/);
  assert.match(migration, /created_by[\s\S]*p_verified_user_id/);
  assert.match(migration, /appointment_id = v_appointment_id/);
  assert.match(migration, /patient_phone = v_verified_phone/);
  assert.match(migration, /token_conflict/);
});
