import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20261003181000_public_directory_foundation.sql", import.meta.url),
  "utf8",
);

test("public directory starts private and never auto-publishes existing clinic data", () => {
  assert.match(migration, /clinic_directory_profiles[\s\S]*is_published boolean not null default false/);
  assert.match(migration, /doctor_directory_profiles[\s\S]*is_published boolean not null default false/);
  assert.doesNotMatch(migration, /insert into public\.clinic_directory_profiles[\s\S]*select/i);
  assert.doesNotMatch(migration, /insert into public\.doctor_directory_profiles[\s\S]*select/i);
});

test("directory management stays limited to clinic owners and managers", () => {
  assert.match(migration, /alter table public\.clinic_directory_profiles enable row level security/);
  assert.match(migration, /alter table public\.doctor_directory_profiles enable row level security/);
  assert.match(migration, /private\.is_clinic_owner\(clinic_id\)[\s\S]*private\.can_manage_clinic\(clinic_id\)/);
  assert.match(migration, /revoke all on table public\.clinic_directory_profiles from public, anon, authenticated/);
  assert.match(migration, /revoke all on table public\.doctor_directory_profiles from public, anon, authenticated/);
});

test("anonymous discovery can read only explicit published fields through bounded RPCs", () => {
  assert.match(migration, /get_public_clinic_profile[\s\S]*p\.is_published/);
  assert.match(migration, /list_public_doctors[\s\S]*c\.is_published[\s\S]*d\.is_published/);
  assert.match(migration, /get_public_doctor_profile[\s\S]*c\.is_published[\s\S]*d\.is_published/);
  assert.match(migration, /grant execute on function public\.get_public_clinic_profile\(text\) to anon, authenticated/);
  assert.match(migration, /grant execute on function public\.list_public_doctors\(text\) to anon, authenticated/);
  assert.match(migration, /grant execute on function public\.get_public_doctor_profile\(text, text\) to anon, authenticated/);
  assert.doesNotMatch(migration, /patient_name|patient_phone|appointment_at|appointment_status|reminder_/i);
});
