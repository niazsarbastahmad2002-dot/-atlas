import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("appointments distinguish the patient from the phone contact without creating contact profiles", async () => {
  const [migration, actions, enhancer, layout, activity] = await Promise.all([
    read("supabase/migrations/20260824124126_appointment_contact_relationship.sql"),
    read("app/dashboard/instant-actions.ts"),
    read("app/dashboard/appointment-contact-relationship.tsx"),
    read("app/dashboard/layout.tsx"),
    read("app/dashboard/activity/page.tsx"),
  ]);

  assert.match(migration, /add column if not exists contact_relationship text not null default 'patient'/);
  assert.match(migration, /'patient', 'parent_guardian', 'relative_caregiver'/);
  assert.match(migration, /contact_relationship is distinct from old\.contact_relationship/);
  assert.equal(migration.includes("'patient_phone', new.patient_phone"), false);
  assert.equal(migration.includes("'patient_name', new.patient_name"), false);
  assert.match(migration, /case when v_contact_relationship = 'patient' then 'patient' else 'contact' end/);

  assert.match(actions, /formData\.get\("contact_relationship"\)/);
  assert.match(actions, /contact_relationship: relationship/);
  assert.match(actions, /getAppointmentContactRelationshipInline/);

  assert.match(enhancer, /Whose phone is this\?/);
  assert.match(enhancer, /Parent \/ guardian/);
  assert.match(enhancer, /Relative \/ caregiver/);
  assert.match(enhancer, /This phone’s owner agreed to WhatsApp reminders/);
  assert.match(enhancer, /select\.name = "contact_relationship"/);
  assert.match(layout, /AppointmentContactRelationshipEnhancer/);
  assert.match(activity, /event\.actor_type === "contact"/);
  assert.match(activity, /Patient contact/);

  assert.equal(migration.includes("create table public.patient_contacts"), false);
  assert.equal(migration.includes("contact_name"), false);
  assert.equal(migration.includes("contact_phone"), false);
});
