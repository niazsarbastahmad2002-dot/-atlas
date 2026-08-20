import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260820053921_add_smart_fill_foundation.sql"),
  "utf8",
);

test("Smart Fill records explicit earlier-slot interest and cancelled openings", () => {
  assert.match(migration, /create table if not exists public\.smart_fill_waitlist/i);
  assert.match(migration, /contact_consent_at timestamptz not null/i);
  assert.match(migration, /create table if not exists public\.smart_fill_open_slots/i);
  assert.match(migration, /new\.status = 'cancelled'/i);
  assert.match(migration, /new\.appointment_at > now\(\)/i);
});

test("Smart Fill preserves clinic and doctor access boundaries", () => {
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /private\.can_access_doctor\(clinic_id, doctor_id\)/i);
  assert.match(migration, /revoke all on public\.smart_fill_waitlist from anon, authenticated/i);
  assert.match(migration, /revoke all on public\.smart_fill_open_slots from anon, authenticated/i);
});

test("patient earlier-slot preference is server-only and token-bound", () => {
  assert.match(migration, /patient_set_earlier_slot_preference/);
  assert.match(migration, /private\.patient_appointment_tokens/);
  assert.match(migration, /t\.revoked_at is null/);
  assert.match(migration, /t\.expires_at > now\(\)/);
  assert.match(migration, /grant execute on function public\.patient_set_earlier_slot_preference\(text, boolean\) to service_role/i);
  assert.doesNotMatch(migration, /grant execute on function public\.patient_set_earlier_slot_preference\(text, boolean\) to (anon|authenticated)/i);
});

test("a replacement appointment closes an open slot without weakening double-booking", () => {
  assert.match(migration, /sync_smart_fill_slot_claim/);
  assert.match(migration, /filled_by_appointment_id = new\.id/);
  assert.match(migration, /source_appointment_id <> new\.id/);
  assert.match(migration, /smart_fill_open_slot_unique_active_idx/);
});
