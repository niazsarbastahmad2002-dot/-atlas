import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("clinic activity history extends the existing audit store without copying patient values", async () => {
  const [migration, activityPage, historyPage] = await Promise.all([
    read("supabase/migrations/20260824131000_clinic_activity_history_foundation.sql"),
    read("app/dashboard/activity/page.tsx"),
    read("app/dashboard/history/page.tsx"),
  ]);

  assert.match(migration, /alter table public\.appointment_audit_events/);
  assert.match(migration, /entity_type text not null default 'appointment'/);
  assert.match(migration, /entity_id uuid/);
  assert.match(migration, /before_state jsonb/);
  assert.match(migration, /after_state jsonb/);
  assert.match(migration, /smart_fill_slot_claimed/);
  assert.match(migration, /smart_fill_slot_released/);
  assert.match(migration, /staff_invited/);
  assert.match(migration, /staff_added/);
  assert.match(migration, /staff_removed/);
  assert.match(migration, /permission_changed/);

  assert.equal(migration.includes("'patient_phone', new.patient_phone"), false);
  assert.equal(migration.includes("'patient_name', new.patient_name"), false);
  assert.match(migration, /Record which fields changed, never the patient name or phone values themselves/);

  assert.match(migration, /private\.can_view_clinic_activity/);
  assert.match(migration, /cm\.role in \('owner', 'manager'\)/);
  assert.match(migration, /revoke insert, update, delete, truncate on public\.appointment_audit_events from anon, authenticated/);
  assert.match(migration, /revoke update, delete, truncate on public\.appointment_audit_events from service_role/);

  assert.match(activityPage, /Activity history/);
  assert.match(activityPage, /membership\?\.role === "owner" \|\| membership\?\.role === "manager"/);
  assert.match(activityPage, /\.eq\("clinic_id", clinic\.id\)/);
  assert.match(activityPage, /does not copy patient names, phone numbers, messages, or appointment notes/);
  assert.match(historyPage, /\/dashboard\/activity\?clinic=/);
});
