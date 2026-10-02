import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("sign-in does not grant clinic access without an explicit clinic or invitation path", () => {
  const activation = source("app/auth/activate/route.ts");
  const dashboard = source("app/dashboard/page.tsx");
  const actions = source("app/dashboard/actions.ts");

  assert.match(activation, /readPendingStaffInvitations/);
  assert.match(activation, /invitation\.clinic_id/);
  assert.match(activation, /role: "receptionist"/);

  assert.match(dashboard, /if \(!clinics\?\.length\)/);
  assert.match(dashboard, /form action=\{createClinic\}/);

  assert.match(actions, /export async function createClinic/);
  assert.match(actions, /\.insert\(\{ name, owner_id: userId \}\)/);

  assert.doesNotMatch(activation, /from\("clinics"\)\.insert/);
  assert.doesNotMatch(activation, /owner_id:\s*userData\.user\.id/);
});

test("settings APIs fail closed without explicit clinic ownership or membership", () => {
  const doctorWorkflow = source("app/api/settings/doctor-workflow/route.ts");
  const reminders = source("app/api/settings/reminders/route.ts");

  for (const api of [doctorWorkflow, reminders]) {
    assert.match(api, /const hasClinicAccess = clinic\.owner_id === userData\.user\.id/);
    assert.match(api, /membership\?\.role === "owner"/);
    assert.match(api, /membership\?\.role === "manager"/);
    assert.match(api, /membership\?\.role === "receptionist"/);
    assert.match(api, /if \(!hasClinicAccess\) return null/);
  }
});

test("clinic live flow fails closed without explicit clinic ownership or membership", () => {
  const liveFlow = source("app/api/clinic-live-flow/route.ts");

  assert.match(liveFlow, /const hasClinicAccess = clinic\.owner_id === userData\.user\.id/);
  assert.match(liveFlow, /membership\?\.role === "owner"/);
  assert.match(liveFlow, /membership\?\.role === "manager"/);
  assert.match(liveFlow, /membership\?\.role === "receptionist"/);
  assert.match(liveFlow, /if \(!hasClinicAccess\) return null/);
});

