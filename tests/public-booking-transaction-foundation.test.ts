import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("public booking finalization is service-role only", () => {
  const migration = source("supabase/migrations/20261003194500_public_booking_transaction_foundation.sql");

  assert.match(migration, /auth\.role\(\)\) <> 'service_role'/);
  assert.match(migration, /revoke all[\s\S]*from public, anon, authenticated/i);
  assert.match(migration, /grant execute[\s\S]*to service_role/i);
  assert.doesNotMatch(migration, /grant execute[\s\S]*to anon/i);
});

test("public booking reuses the public slot contract and core appointment table", () => {
  const migration = source("supabase/migrations/20261003194500_public_booking_transaction_foundation.sql");

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

test("public booking is idempotent and audit-attributed without weakening patient privacy", () => {
  const migration = source("supabase/migrations/20261003194500_public_booking_transaction_foundation.sql");

  assert.match(migration, /idempotency_key = p_idempotency_key/);
  assert.match(migration, /'duplicate'::text/);
  assert.match(migration, /'idempotency_mismatch'::text/);
  assert.match(migration, /set_config\('atlas\.actor_type', 'patient', true\)/);
  assert.match(migration, /p_patient_phone !~ '\^\\\+9647\[0-9\]\{9\}\
});
/);
});
