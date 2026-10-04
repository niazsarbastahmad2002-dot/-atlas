import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = () => readFileSync(new URL("../app/dashboard/instant-actions.ts", import.meta.url), "utf8");

test("inline appointment mutations require explicit clinic ownership or membership", () => {
  const action = source();

  assert.match(action, /async function appointmentClinicContext\(clinicId: string\)/);
  assert.match(action, /supabase\.auth\.getUser\(\)/);
  assert.match(action, /from\("clinics"\)\.select\("id, owner_id"\)/);
  assert.match(action, /from\("clinic_members"\)[\s\S]*\.eq\("user_id", userData\.user\.id\)/);
  assert.match(action, /const isClinicOwner = clinic\.owner_id === userData\.user\.id/);
  assert.match(action, /if \(!isClinicOwner && membershipError\) return null/);
  assert.match(action, /membership\?\.role === "owner"/);
  assert.match(action, /membership\?\.role === "manager"/);
  assert.match(action, /membership\?\.role === "receptionist"/);

  const guardCalls = action.match(/await appointmentClinicContext\(clinicId\)/g) ?? [];
  assert.equal(guardCalls.length, 4);
});

test("unauthorized inline appointment actions fail before writes", () => {
  const action = source();
  for (const name of [
    "createAppointmentInline",
    "updateAppointmentStatusInline",
    "updateAppointmentDetailsInline",
    "archiveAppointmentInline",
  ]) {
    const start = action.indexOf(`export async function ${name}`);
    assert.ok(start >= 0, `${name} must exist`);
    const nextExport = action.indexOf("export async function ", start + 1);
    const block = action.slice(start, nextExport >= 0 ? nextExport : action.length);
    const guard = block.indexOf("await appointmentClinicContext(clinicId)");
    const failure = block.indexOf('if (!context) return { ok: false, reason: "invalid" }');
    const write = block.search(/\.insert\(|\.update\(/);
    assert.ok(guard >= 0, `${name} must authorize clinic access`);
    assert.ok(failure > guard, `${name} must fail closed after authorization`);
    assert.ok(write < 0 || failure < write, `${name} must authorize before any write`);
  }
});
