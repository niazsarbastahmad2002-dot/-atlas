import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("clinic activity history extends the existing audit store without copying patient values", async () => {
  const [migration, attribution, activityPage, historyPage] = await Promise.all([
    read("supabase/migrations/20260824131000_clinic_activity_history_foundation.sql"),
    read("supabase/migrations/20260824131500_activity_actor_attribution.sql"),
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

  assert.match(attribution, /current_setting\('atlas\.actor_id', true\)/);
  assert.match(attribution, /set_config\('atlas\.actor_id', p_actor_id::text, true\)/);
  assert.match(attribution, /v_actor_id := v_user_id/);
  assert.match(attribution, /only the current clinic administrator can transfer administration/);

  assert.match(activityPage, /Activity history/);
  assert.match(activityPage, /membership\?\.role === "owner" \|\| membership\?\.role === "manager"/);
  assert.match(activityPage, /\.eq\("clinic_id", clinic\.id\)/);
  assert.match(activityPage, /does not copy patient names, phone numbers, messages, or appointment notes/);
  assert.match(historyPage, /\/dashboard\/activity\?clinic=/);
});

test("clinic cascade deletion skips orphan activity while manual staff removal stays audited", async () => {
  const migration = await read(
    "supabase/migrations/20260826070024_skip_member_audit_during_clinic_cascade.sql",
  );

  assert.match(
    migration,
    /elsif tg_op = 'DELETE' then[\s\S]*v_action := 'staff_removed';[\s\S]*v_clinic_id := old\.clinic_id;/,
  );
  assert.match(
    migration,
    /if tg_op = 'DELETE'\s+and not exists \(\s+select 1\s+from public\.clinics c\s+where c\.id = v_clinic_id\s+\) then\s+return old;/,
  );
  assert.match(migration, /insert into public\.appointment_audit_events/);
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);

  assert.equal(/create policy|drop policy|alter policy/i.test(migration), false);
  assert.equal(/delete_atlas_account|clinic_members_delete|clinics_delete/.test(migration), false);
});
