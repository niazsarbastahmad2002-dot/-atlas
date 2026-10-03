import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("public booking finalization is service-role only", () => {
  const migration = source("supabase/migrations/20261003195530_public_booking_transaction_foundation.sql");

  assert.match(migration, /auth\.role\(\)\) <> 'service_role'/);
  assert.match(migration, /revoke all[\s\S]*from public, anon, authenticated/i);
  assert.match(migration, /grant execute[\s\S]*to service_role/i);
  assert.doesNotMatch(migration, /grant execute[\s\S]*to anon/i);
});

test("public booking reuses the public slot contract and core appointment table", () => {
  const migration = source("supabase/migrations/20261003195530_public_booking_transaction_foundation.sql");

  assert.match(migration, /list_public_doctor_slots/);
  assert.match(migration, /booking\.enabled/);
  assert.match(migration, /c\.is_published/);
  assert.match(migration, /d\.is_published/);
  assert.match(migration, /core_doctor\.active/);
  assert.match(migration, /insert into public\.appointments/);
  assert.match(migration, /contact_relationship,[\s\S]*'patient'/);
  assert.match(migration, /status[\s\S]*'pending'/);
  assert.match(migration, /unique_violation[\s\S]*slot_taken/);
});

test("public booking is idempotent and audit-attributed", () => {
  const migration = source("supabase/migrations/20261003195530_public_booking_transaction_foundation.sql");

  assert.match(migration, /idempotency_key = p_idempotency_key/);
  assert.match(migration, /on conflict \(clinic_id, idempotency_key\) do nothing/);
  assert.match(migration, /if v_appointment_id is null then/);
  assert.match(migration, /'duplicate'::text/);
  assert.match(migration, /'idempotency_mismatch'::text/);
  assert.match(migration, /set_config\('atlas\.actor_type', 'patient', true\)/);
});

test("public booking validates patient inputs before database insertion", () => {
  const migration = source("supabase/migrations/20261003195530_public_booking_transaction_foundation.sql");

  assert.match(migration, /p_patient_phone is null/);
  assert.ok(migration.includes("p_patient_phone !~ '^\\+9647[0-9]{9}$'"));
  assert.match(migration, /p_reminder_language is null/);
  assert.match(migration, /p_reminder_consent is null/);
});


test("idempotent retries recover an existing booking before current publication checks", () => {
  const migration = source("supabase/migrations/20261003195530_public_booking_transaction_foundation.sql");
  const duplicateAt = migration.indexOf("if found then");
  const availabilityAt = migration.indexOf("coalesce(v_clinic_published, false)");

  assert.ok(duplicateAt > 0);
  assert.ok(availabilityAt > duplicateAt);
  assert.match(migration, /left join public\.clinic_public_booking_settings booking/);
});
