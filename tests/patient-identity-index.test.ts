import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20261004025000_patient_appointment_accounts_clinic_index.sql", import.meta.url),
  "utf8",
);

test("patient appointment account clinic foreign key has a covering index", () => {
  assert.match(migration, /create index if not exists patient_appointment_accounts_clinic_idx/);
  assert.match(migration, /on private\.patient_appointment_accounts \(clinic_id\)/);
});
