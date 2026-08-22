import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

// App Store readiness regression coverage.
// This file intentionally verifies release-facing product/security contracts from source.

test("phone-first iOS no longer exposes native Apple sign-in while historical Apple cleanup remains identity-bound", async () => {
  const [nativeApp, appleServer, appleLinkRoute, retryMigration] = await Promise.all([
    read("ios/Atlas/AtlasApp.swift"),
    read("lib/apple-server.ts"),
    read("app/api/auth/apple/link/route.ts"),
    read("supabase/migrations/20260820225813_harden_apple_revocation_retry.sql"),
  ]);

  assert.match(nativeApp, /Continue with WhatsApp/);
  assert.match(nativeApp, /Verify WhatsApp and join/);
  assert.doesNotMatch(nativeApp, /SignInWithAppleButton/);
  assert.doesNotMatch(nativeApp, /AuthenticationServices/);
  assert.match(appleServer, /https:\/\/appleid\.apple\.com\/auth\/token/);
  assert.match(appleServer, /https:\/\/appleid\.apple\.com\/auth\/revoke/);
  assert.match(appleServer, /store_apple_refresh_token_service/);
  assert.match(appleServer, /get_apple_revocation_credential_service/);
  assert.match(appleServer, /delete_apple_refresh_secret_service/);
  assert.match(appleServer, /expectedAppleSubject: string/);
  assert.match(appleServer, /!appleSubject \|\| appleSubject !== input\.expectedAppleSubject/);
  assert.match(appleLinkRoute, /if \(!expectedAppleSubject\)/);
  assert.match(retryMigration, /apple/i);
});
