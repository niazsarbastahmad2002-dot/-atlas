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
  assert.match(action, /const hasClinicAccess = clinic\.owner_id === userData\.user\.id/);
  assert.match(action, /membership\?\.role === "owner"/);
  assert.match(action, /membership\?\.role === "manager"/);
  assert.match(action, /membership\?\.role === "receptionist"/);
  assert.match(action, /if \(!hasClinicAccess\) return null/);

  const guardCalls = action.match(/await appointmentClinicContext\(clinicId\)/g) ?? [];
  assert.equal(guardCalls.length, 4);
});

test("unauthorized inline appointment actions fail before doctor or appointment writes", () => {
  const action = source();
  const functions = [
    "createAppointmentInline",
    "updateAppointmentStatusInline",
    "updateAppointmentDetailsInline",
    "archiveAppointmentInline",
  ];

  for (let index = 0; index < functions.length; index += 1) {
    const start = action.indexOf(`export async function ${functions[index]}`);
    const end = index + 1 < functions.length
      ? action.indexOf(`export async function ${functions[index + 1]}`)
      : action.length;
    assert.ok(start >= 0);
    const block = action.slice(start, end);
    const guard = block.indexOf("await appointmentClinicContext(clinicId)");
    const failure = block.indexOf('if (!context) return { ok: false, reason: "invalid" }');
    const write = block.search(/\.insert\(|\.update\(/);
    assert.ok(guard >= 0);
    assert.ok(failure > guard);
    assert.ok(write < 0 || failure < write);
  }
});
