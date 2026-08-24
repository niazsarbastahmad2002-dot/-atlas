import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("account deletion remains explicit and cannot cascade an owned clinic", async () => {
  const [action, page, ownershipGuard, nativeApp] = await Promise.all([
    read("app/dashboard/settings/account/actions.ts"),
    read("app/dashboard/settings/account/page.tsx"),
    read("supabase/migrations/20260824124500_restore_account_delete_clinic_ownership_guard.sql"),
    read("ios/Atlas/AtlasApp.swift"),
  ]);

  assert.match(action, /\.from\("clinics"\)[\s\S]*\.eq\("owner_id", userData\.user\.id\)/);
  assert.match(action, /if \(ownedClinics\?\.length\) redirect\(accountUrl\("owns_clinic"\)\)/);
  assert.ok(
    action.indexOf("ownedClinics?.length") < action.indexOf("auth.admin.deleteUser"),
    "owned-clinic guard must run before auth deletion",
  );

  assert.match(page, /Type DELETE to confirm/);
  assert.match(page, /Permanently delete my account/);
  assert.match(page, /\/dashboard\/staff\?clinic=/);
  assert.match(page, /\/dashboard\/settings\/delete\?clinic=/);

  assert.match(ownershipGuard, /on delete restrict/i);
  assert.doesNotMatch(ownershipGuard, /on delete cascade/i);

  assert.match(nativeApp, /url\.path == "\/login"/);
  assert.match(nativeApp, /parent\.onContinuityClear\(\)/);
});
