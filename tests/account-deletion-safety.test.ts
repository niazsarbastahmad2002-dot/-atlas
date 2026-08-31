import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("account deletion remains explicit and cannot cascade an owned clinic", async () => {
  const [action, page, ownershipGuard, nativeApp, appleServer] = await Promise.all([
    read("app/dashboard/settings/account/actions.ts"),
    read("app/dashboard/settings/account/page.tsx"),
    read("supabase/migrations/20260824124500_restore_account_delete_clinic_ownership_guard.sql"),
    read("ios/Atlas/AtlasApp.swift"),
    read("lib/apple-server.ts"),
  ]);

  assert.match(action, /\.from\("clinics"\)[\s\S]*\.eq\("owner_id", userData\.user\.id\)/);
  assert.match(action, /if \(ownedClinics\?\.length\) redirect\(accountUrl\("owns_clinic"\)\)/);
  assert.ok(
    action.indexOf("ownedClinics?.length") < action.indexOf("auth.admin.deleteUser"),
    "owned-clinic guard must run before auth deletion",
  );

  assert.match(action, /if \(hasAppleIdentity\) \{[\s\S]*appleCredential = await getStoredAppleRevocationCredential/);
  assert.ok(
    action.indexOf("if (hasAppleIdentity)") < action.indexOf("appleCredential = await getStoredAppleRevocationCredential"),
    "Apple credential lookup must be guarded by an Apple identity check",
  );
  assert.match(appleServer, /admin\.rpc\.bind\(admin\)/);

  assert.match(page, /Type DELETE to confirm/);
  assert.match(page, /Permanently delete my Atlas account/);
  assert.match(page, /Deleting a clinic removes only that clinic workspace/);
  assert.match(page, /\/dashboard\/staff\?clinic=/);
  assert.match(page, /\/dashboard\/settings\/delete\?clinic=/);

  assert.match(ownershipGuard, /on delete restrict/i);
  assert.doesNotMatch(ownershipGuard, /on delete cascade/i);

  assert.match(nativeApp, /url\.path == "\/login"/);
  assert.match(nativeApp, /parent\.onContinuityClear\(\)/);
});

test("clinic deletion requires two confirmations and keeps account deletion separate", async () => {
  const [deleteAction, deletePage, accountPage] = await Promise.all([
    read("app/dashboard/settings/delete/actions.ts"),
    read("app/dashboard/settings/delete/page.tsx"),
    read("app/dashboard/settings/account/page.tsx"),
  ]);

  assert.match(deletePage, /Permanent and irreversible/);
  assert.match(deletePage, /Type the clinic name exactly to confirm/);
  assert.match(deletePage, /name="acknowledge" value="yes" required/);
  assert.match(deletePage, /I understand this clinic and its data will be permanently deleted\./);

  assert.match(deleteAction, /const acknowledged = String\(formData\.get\("acknowledge"\) \?\? ""\) === "yes"/);
  assert.match(deleteAction, /if \(!acknowledged\) redirect\(deleteUrl\(clinicId, "confirmation_required"\)\)/);
  assert.match(deleteAction, /if \(confirmation !== clinic\.name\) redirect\(deleteUrl\(clinicId, "name_mismatch"\)\)/);
  assert.ok(
    deleteAction.indexOf("!acknowledged") < deleteAction.indexOf('.from("clinics")\n    .delete()'),
    "acknowledgement must be required before clinic deletion",
  );

  assert.match(deleteAction, /redirect\("\/dashboard\/settings\/account\?notice=clinic_deleted"\)/);
  assert.doesNotMatch(deleteAction, /supabase\.auth\.signOut/);

  assert.match(accountPage, /Clinic deleted\. Your Atlas account is still active\./);
  assert.match(accountPage, /Keep my Atlas account \/ Create a clinic later/);
  assert.match(accountPage, /Delete my Atlas account too/);
  assert.match(accountPage, /href="#delete-atlas-account"/);
  assert.match(accountPage, /id="delete-atlas-account"/);
});
