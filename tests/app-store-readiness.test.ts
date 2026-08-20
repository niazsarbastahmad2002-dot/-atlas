import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("iOS release identity and privacy manifest stay explicit", async () => {
  const [project, entitlements, privacy] = await Promise.all([
    read("ios/project.yml"),
    read("ios/Atlas/Atlas.entitlements"),
    read("ios/Atlas/PrivacyInfo.xcprivacy"),
  ]);

  assert.match(project, /PRODUCT_BUNDLE_IDENTIFIER: com\.atlasappointments\.app/);
  assert.match(project, /ASSETCATALOG_COMPILER_APPICON_NAME: AppIcon/);
  assert.match(project, /ATLAS_ASSOCIATED_DOMAIN: atlasappointments\.com/);
  assert.match(entitlements, /com\.apple\.developer\.applesignin/);
  assert.match(entitlements, /com\.apple\.developer\.associated-domains/);
  assert.match(entitlements, /applinks:\$\(ATLAS_ASSOCIATED_DOMAIN\)/);
  assert.match(privacy, /NSPrivacyAccessedAPICategoryUserDefaults/);
  assert.match(privacy, /CA92\.1/);
  assert.match(privacy, /<key>NSPrivacyTracking<\/key>\s*<false\/>/);
});

test("Apple native sign-in preserves invite context and revocation credentials", async () => {
  const [nativeApp, nativePage, appleServer, retryMigration] = await Promise.all([
    read("ios/Atlas/AtlasApp.swift"),
    read("app/auth/native/page.tsx"),
    read("lib/apple-server.ts"),
    read("supabase/migrations/20260820225813_harden_apple_revocation_retry.sql"),
  ]);

  assert.match(nativeApp, /authorizationCode/);
  assert.match(nativeApp, /URLQueryItem\(name: "authorization_code"/);
  assert.match(nativeApp, /URLQueryItem\(name: "next"/);
  assert.match(nativePage, /\/api\/auth\/apple\/link/);
  assert.match(nativePage, /safeAuthDestination/);
  assert.match(appleServer, /https:\/\/appleid\.apple\.com\/auth\/token/);
  assert.match(appleServer, /https:\/\/appleid\.apple\.com\/auth\/revoke/);
  assert.match(appleServer, /store_apple_refresh_token_service/);
  assert.match(appleServer, /get_apple_revocation_credential_service/);
  assert.match(appleServer, /delete_apple_refresh_secret_service/);
  assert.match(retryMigration, /refresh_secret_id uuid/);
});

test("OAuth callback never guesses which provider owns a generic refresh token", async () => {
  const callback = await read("app/auth/callback/route.ts");
  assert.doesNotMatch(callback, /session\??\.provider_refresh_token/);
  assert.doesNotMatch(callback, /storeWebAppleProviderRefreshToken/);
});

test("account deletion is in-app, retry-safe, and clinic ownership is protected", async () => {
  const [accountAction, accountPage, migration] = await Promise.all([
    read("app/dashboard/settings/account/actions.ts"),
    read("app/dashboard/settings/account/page.tsx"),
    read("supabase/migrations/20260820223722_protect_clinic_ownership_on_account_delete.sql"),
  ]);

  assert.match(accountAction, /getStoredAppleRevocationCredential/);
  assert.match(accountAction, /revokeAppleAuthorization/);
  assert.match(accountAction, /cleanupAppleRefreshSecret/);
  assert.match(accountAction, /auth\.admin\.deleteUser/);
  assert.ok(
    accountAction.indexOf("auth.admin.deleteUser") < accountAction.indexOf("revokeAppleAuthorization(appleCredential)"),
    "Apple authorization must not be revoked until Atlas account deletion succeeds",
  );
  assert.match(accountPage, /Settings|DELETE/);
  assert.match(migration, /ON DELETE RESTRICT/i);
});

test("public App Store support and deletion pages remain present", async () => {
  const [home, support, privacy, deletion] = await Promise.all([
    read("app/page.tsx"),
    read("app/support/page.tsx"),
    read("app/privacy/page.tsx"),
    read("app/data-deletion/page.tsx"),
  ]);

  assert.match(home, /href="\/support"/);
  assert.match(home, /href="\/privacy"/);
  assert.match(home, /href="\/terms"/);
  assert.match(support, /Atlas Support/);
  assert.match(privacy, /Account and sign-in information/);
  assert.match(deletion, /Settings → Account &amp; deletion/);
});
