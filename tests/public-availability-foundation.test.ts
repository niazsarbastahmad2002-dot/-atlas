import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20261003190534_public_availability_v1.sql", import.meta.url),
  "utf8",
);

test("public booking is opt-in and does not constrain receptionist scheduling", () => {
  assert.match(migration, /clinic_public_booking_settings[\s\S]*enabled boolean not null default false/);
  assert.match(migration, /doctor_public_booking_hours/);
  assert.doesNotMatch(migration, /alter table public\.appointments[\s\S]*check/i);
  assert.doesNotMatch(migration, /create trigger[\s\S]*on public\.appointments/i);
});

test("public slots require published active profiles and an enabled booking source", () => {
  assert.match(migration, /list_public_doctor_slots/);
  assert.match(migration, /c\.is_published/);
  assert.match(migration, /d\.is_published/);
  assert.match(migration, /core_doctor\.active/);
  assert.match(migration, /s\.enabled/);
  assert.match(migration, /hours\.is_enabled/);
});

test("public slot reads are bounded and omit closed or occupied times", () => {
  assert.match(migration, /least\(coalesce\(p_days, 7\), 14\)/);
  assert.match(migration, /booking_horizon_days/);
  assert.match(migration, /min_lead_minutes/);
  assert.match(migration, /doctor_public_booking_closed_dates/);
  assert.match(migration, /a\.status in \('pending', 'confirmed'\)/);
  assert.match(migration, /a\.appointment_at < candidates\.slot_at/);
  assert.match(migration, /limit 200/);
});

test("anonymous availability reveals only slot time and interval", () => {
  assert.match(migration, /returns table\(\s*slot_at timestamptz,\s*appointment_interval_minutes integer\s*\)/);
  assert.match(migration, /grant execute on function public\.list_public_doctor_slots\(text, text, date, integer\)[\s\S]*to anon, authenticated/);
  assert.doesNotMatch(migration, /patient_name|patient_phone|reminder_language/);
});

test("public booking configuration remains manager-only", () => {
  assert.match(migration, /alter table public\.clinic_public_booking_settings enable row level security/);
  assert.match(migration, /private\.can_manage_clinic\(clinic_id\)/);
  assert.match(migration, /revoke all on table public\.doctor_public_booking_hours from public, anon, authenticated/);
});
