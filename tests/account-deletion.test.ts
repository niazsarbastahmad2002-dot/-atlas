import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const actionSource = readFileSync(new URL("../app/dashboard/settings/account/actions.ts", import.meta.url), "utf8");
const pageSource = readFileSync(new URL("../app/dashboard/settings/account/page.tsx", import.meta.url), "utf8");
const layoutSource = readFileSync(new URL("../app/dashboard/settings/layout.tsx", import.meta.url), "utf8");
const appleSource = readFileSync(new URL("../lib/apple-auth.ts", import.meta.url), "utf8");
const nativeSource = readFileSync(new URL("../app/auth/native/page.tsx", import.meta.url), "utf8");
const swiftSource = readFileSync(new URL("../ios/Atlas/AtlasApp.swift", import.meta.url), "utf8");
const migrationSource = readFileSync(new URL("../supabase/migrations/20260820221719_secure_apple_identity_revocation.sql", import.meta.url), "utf8");

test("Atlas exposes full in-app account deletion", () => {
  assert.match(layoutSource, /\/dashboard\/settings\/account/);
  assert.match(pageSource, /Permanently delete my account/);
  assert.match(pageSource, /Type your email address exactly to confirm/);
});

test("account deletion requires the authenticated user's exact email and uses server admin deletion", () => {
  assert.match(actionSource, /supabase\.auth\.getUser\(\)/);
  assert.match(actionSource, /confirmation !== email/);
  assert.match(actionSource, /createAdminClient\(\)/);
  assert.match(actionSource, /admin\.auth\.admin\.deleteUser\(user\.id\)/);
});

test("owner deletion warns that owned clinic data is also removed", () => {
  assert.match(pageSource, /Deleting your account will also permanently delete every clinic you own/);
  assert.match(pageSource, /appointments, doctors, staff access, reminders, patient links/);
});

test("native Apple login retains the one-time authorization code for later revocation", () => {
  assert.match(swiftSource, /credential\.authorizationCode/);
  assert.match(swiftSource, /authorization_code/);
  assert.match(nativeSource, /params\.get\("authorization_code"\)/);
  assert.match(nativeSource, /\/api\/auth\/apple\/retain/);
});

test("Apple refresh tokens stay in Vault and client roles cannot read them", () => {
  assert.match(migrationSource, /vault\.create_secret/);
  assert.match(migrationSource, /vault\.decrypted_secrets/);
  assert.match(migrationSource, /revoke all on private\.apple_identity_tokens from anon, authenticated/);
  assert.match(migrationSource, /grant execute on function public\.get_apple_refresh_token_service\(uuid\) to service_role/);
});

test("account deletion revokes and forgets Apple authorization before deleting the Atlas user", () => {
  assert.match(appleSource, /https:\/\/appleid\.apple\.com/);
  assert.match(appleSource, /\/auth\/revoke/);
  assert.match(appleSource, /delete_apple_refresh_token_service/);
  const revokePosition = actionSource.indexOf("revokeAndForgetStoredAppleAuthorization(user.id)");
  const deletePosition = actionSource.indexOf("admin.auth.admin.deleteUser(user.id)");
  assert.ok(revokePosition >= 0 && deletePosition > revokePosition);
});
