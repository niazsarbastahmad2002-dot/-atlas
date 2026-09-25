import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("database index hygiene removes the duplicate activity index and covers export requester FK", async () => {
  const migration = await readFile(
    new URL("../supabase/migrations/20260925130500_database_index_hygiene.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /drop index if exists public\.appointment_audit_clinic_time_idx/);
  assert.match(migration, /create index if not exists clinic_export_audit_requested_by_idx/);
  assert.match(migration, /on public\.clinic_export_audit \(requested_by\)/);
  assert.match(migration, /where requested_by is not null/);
});
