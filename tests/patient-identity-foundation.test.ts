import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = source("supabase/migrations/20261004052300_patient_identity_foundation.sql");

test("patient profile is private, minimal, and owned by the authenticated identity", () => {
  assert.match(migration, /create table public\.patient_profiles/);
  assert.match(migration, /user_id uuid primary key references auth\.users\(id\) on delete cascade/);
  assert.match(migration, /display_name text not null/);
  assert.match(migration, /preferred_language text not null/);
  assert.doesNotMatch(migration, /patient_profiles[\s\S]{0,500}phone text/i);
  assert.match(migration, /alter table public\.patient_profiles enable row level security/);
  assert.match(migration, /patient_profiles_select_own[\s\S]*user_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /current_verified_patient_phone\(\) is not null/);
  assert.match(migration, /revoke all on table public\.patient_profiles from public, anon, authenticated/);
});

test("patient appointment ownership stays in the private schema and is denied to clients", () => {
  assert.match(migration, /create table private\.patient_appointment_accounts/);
  assert.match(migration, /appointment_id uuid primary key references public\.appointments\(id\) on delete cascade/);
  assert.match(migration, /user_id uuid not null references auth\.users\(id\) on delete cascade/);
  assert.match(migration, /revoke all on table private\.patient_appointment_accounts from public, anon, authenticated/);
  assert.match(migration, /patient_appointment_accounts_deny_client_access[\s\S]*using \(false\)[\s\S]*with check \(false\)/);
});

test("verified public booking creates the durable patient link and reusable profile without granting clinic access", () => {
  assert.match(migration, /from auth\.users u[\s\S]*u\.phone_confirmed_at is not null/);
  assert.match(migration, /insert into private\.patient_appointment_accounts/);
  assert.match(migration, /insert into public\.patient_profiles/);
  assert.match(migration, /on conflict \(user_id\) do update/);
  assert.match(migration, /insert into private\.patient_appointment_tokens/);
  assert.doesNotMatch(migration, /clinic_members|redeem_staff_invite|assigned_doctor_id/);
});

test("patient profile reuse does not weaken the service-role booking boundary", () => {
  assert.match(migration, /auth\.role\(\)\) <> 'service_role'/);
  assert.match(migration, /revoke all on function public\.finalize_verified_public_booking_service[\s\S]*from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.finalize_verified_public_booking_service[\s\S]*to service_role/i);
});
