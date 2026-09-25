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
