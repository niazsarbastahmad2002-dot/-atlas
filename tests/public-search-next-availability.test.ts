import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("next-availability search composes existing public contracts as security invoker", () => {
  const migration = source("supabase/migrations/20261003212045_public_search_next_availability.sql");

  assert.match(migration, /search_public_doctors_with_availability/);
  assert.match(migration, /security invoker/i);
  assert.match(migration, /public\.search_public_doctors\(/);
  assert.match(migration, /public\.list_public_doctor_slots\(/);
  assert.match(migration, /match\.clinic_slug/);
  assert.match(migration, /match\.doctor_slug/);
  assert.doesNotMatch(migration, /private\./);
  assert.doesNotMatch(migration, /public\.appointments/);
});

test("next-availability lookup remains bounded and read-only", () => {
  const migration = source("supabase/migrations/20261003212045_public_search_next_availability.sql");

  assert.match(migration, /greatest\(1, least\(coalesce\(p_limit, 20\), 30\)\)/);
  assert.match(migration, /null,[\s\S]*14/);
  assert.match(migration, /order by slot\.slot_at[\s\S]*limit 1/);
  assert.doesNotMatch(migration, /insert into|update public\.|delete from/i);
});

test("next-availability search is explicitly public like the underlying directory contracts", () => {
  const migration = source("supabase/migrations/20261003212045_public_search_next_availability.sql");

  assert.match(migration, /revoke all[\s\S]*from public, anon, authenticated/i);
  assert.match(migration, /grant execute[\s\S]*to anon, authenticated/i);
});

test("public care search displays the next real Baghdad opening when one exists", () => {
  const page = source("app/care/page.tsx");

  assert.match(page, /search_public_doctors_with_availability/);
  assert.match(page, /doctor\.next_available_at/);
  assert.match(page, /timeZone: "Asia\/Baghdad"/);
  assert.match(page, /formatLocalDateValue/);
  assert.match(page, /formatTimeValue/);
  assert.match(page, /atlas-care-next-opening/);
});

test("reschedule migration filename matches the applied Supabase history", () => {
  const testSource = source("tests/patient-self-reschedule.test.ts");

  assert.match(testSource, /20261003202856_patient_reschedule_slots_read_only\.sql/);
  assert.doesNotMatch(testSource, /20261003203000_patient_reschedule_slots_read_only\.sql/);
});
