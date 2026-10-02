import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = () => readFileSync(new URL("../app/dashboard/actions.ts", import.meta.url), "utf8");

test("dashboard clinic actions require explicit clinic ownership or membership", () => {
  const actions = source();

  assert.match(actions, /async function authorizeClinic\(clinicId: string\)/);
  assert.match(actions, /from\("clinics"\)[\s\S]*select\("id, owner_id"\)/);
  assert.match(actions, /from\("clinic_members"\)[\s\S]*\.eq\("user_id", userId\)/);
  assert.match(actions, /const hasClinicAccess = clinic\?\.owner_id === userId/);
  assert.match(actions, /membership\?\.role === "owner"/);
  assert.match(actions, /membership\?\.role === "manager"/);
  assert.match(actions, /membership\?\.role === "receptionist"/);
  assert.match(actions, /clinicError \|\| membershipError \|\| !clinic \|\| !hasClinicAccess/);
  assert.match(actions, /redirect\(dashboardUrl\("error", "clinic_unavailable"\)\)/);
});

test("appointment and doctor server actions keep using the guarded clinic context", () => {
  const actions = source();
  for (const name of [
    "updateClinicInterval",
    "createDoctor",
    "updateDoctor",
    "setDoctorActive",
    "moveDoctor",
    "createAppointment",
    "updateAppointmentStatus",
    "archiveAppointment",
  ]) {
    const start = actions.indexOf(`export async function ${name}`);
    assert.ok(start >= 0, `${name} must exist`);
    const nextExport = actions.indexOf("export async function ", start + 1);
    const block = actions.slice(start, nextExport >= 0 ? nextExport : actions.length);
    assert.match(block, /authorizeClinic\(clinicId\)/, `${name} must use authorizeClinic`);
  }
});
