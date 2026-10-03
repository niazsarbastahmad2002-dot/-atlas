import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("patient self-reschedule RPCs remain service-role only", () => {
  const migration = source("supabase/migrations/20261003202616_patient_self_reschedule_public_slots.sql");

  assert.match(migration, /patient_list_reschedule_slots/);
  assert.match(migration, /patient_reschedule_appointment/);
  assert.match(migration, /auth\.role\(\)\) <> 'service_role'/);
  assert.match(migration, /revoke all[\s\S]*from public, anon, authenticated/i);
  assert.match(migration, /grant execute[\s\S]*to service_role/i);
});

test("reschedule offers only the same truthful public slots", () => {
  const migration = source("supabase/migrations/20261003202616_patient_self_reschedule_public_slots.sql");

  assert.match(migration, /private\.patient_appointment_tokens/);
  assert.match(migration, /cdp\.is_published/);
  assert.match(migration, /ddp\.is_published/);
  assert.match(migration, /list_public_doctor_slots/);
  assert.match(migration, /greatest\(1, least\(coalesce\(p_days, 7\), 14\)\)/);
  assert.match(migration, /limit 60/);
  assert.match(migration, /where s\.slot_at <> v_current_slot/);
});

test("patient reschedule mutates the existing appointment and keeps race protection", () => {
  const migration = source("supabase/migrations/20261003202616_patient_self_reschedule_public_slots.sql");

  assert.match(migration, /for update of a/);
  assert.match(migration, /set_config\('atlas\.actor_type', 'patient', true\)/);
  assert.match(migration, /update public\.appointments[\s\S]*set appointment_at = p_slot_at/);
  assert.match(migration, /unique_violation[\s\S]*slot_taken/);
  assert.doesNotMatch(migration, /insert into public\.appointments/);
});

test("stable reschedule slot reads stay read-only after production fix", () => {
  const fix = source("supabase/migrations/20261003202856_patient_reschedule_slots_read_only.sql");

  assert.match(fix, /language plpgsql[\s\S]*stable[\s\S]*security definer/i);
  assert.doesNotMatch(fix, /update private\.patient_appointment_tokens/);
});

test("private patient UI lists and submits reschedule slots through server actions", () => {
  const page = source("app/patient/[token]/page.tsx");
  const actions = source("app/patient/[token]/actions.ts");

  assert.match(page, /patient_list_reschedule_slots/);
  assert.match(page, /p_days: 7/);
  assert.match(page, /rescheduleSlots = rescheduleResult\.data\.slice\(0, 8\)/);
  assert.match(page, /reschedulePatientAppointment\.bind\(null, token, slot\.slot_at\)/);
  assert.match(actions, /const context = await patientMutationAdmin\(token\)/);
  assert.match(actions, /patient_reschedule_appointment/);
  assert.match(actions, /revalidatePath\(\`\/patient\/\$\{token\}\`\)/);
  assert.doesNotMatch(actions, /\.from\("appointments"\)/);
});


test("patient reschedule requires explicit confirmation before a slot change", () => {
  const page = source("app/patient/[token]/page.tsx");
  const button = source("app/patient/[token]/patient-submit-button.tsx");

  assert.match(page, /confirmMessage=\{text\.rescheduleConfirm\.replace/);
  assert.match(button, /confirmMessage\?: string/);
  assert.match(button, /window\.confirm\(confirmMessage\)/);
  assert.match(button, /event\.preventDefault\(\)/);
});
