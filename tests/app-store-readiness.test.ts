import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const readBytes = (path: string) => readFile(new URL(`../${path}`, import.meta.url));

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

test("iOS release identity and privacy manifest stay explicit", async () => {
  const [project, entitlements, privacy] = await Promise.all([
    read("ios/project.yml"),
    read("ios/Atlas/Atlas.entitlements"),
    read("ios/Atlas/PrivacyInfo.xcprivacy"),
  ]);

  assert.match(project, /PRODUCT_BUNDLE_IDENTIFIER: com\.atlasappointments\.app/);
  assert.match(project, /ASSETCATALOG_COMPILER_APPICON_NAME: AppIcon/);
  assert.match(project, /ATLAS_ASSOCIATED_DOMAIN: atlasappointments\.com/);
  assert.match(project, /ITSAppUsesNonExemptEncryption: false/);
  assert.match(project, /UIColorName: LaunchBackground/);
  assert.match(project, /UIImageName: LaunchMark/);
  assert.doesNotMatch(project, /CFBundleURLTypes/);
  assert.match(entitlements, /com\.apple\.developer\.applesignin/);
  assert.match(entitlements, /com\.apple\.developer\.associated-domains/);
  assert.match(entitlements, /applinks:\$\(ATLAS_ASSOCIATED_DOMAIN\)/);
  assert.match(privacy, /NSPrivacyAccessedAPICategoryUserDefaults/);
  assert.match(privacy, /CA92\.1/);
  assert.match(privacy, /<key>NSPrivacyTracking<\/key>\s*<false\/>/);
});

test("App Store icon is a complete opaque 1024px PNG", async () => {
  const png = await readBytes("ios/Atlas/Assets.xcassets/AppIcon.appiconset/atlas-app-icon.png");
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);

  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = -1;
  let reachedEnd = false;
  while (offset < png.length) {
    assert.ok(offset + 12 <= png.length, "PNG chunk header is truncated");
    const length = png.readUInt32BE(offset);
    const typeStart = offset + 4;
    const dataStart = typeStart + 4;
    const dataEnd = dataStart + length;
    const crcEnd = dataEnd + 4;
    assert.ok(crcEnd <= png.length, "PNG chunk data is truncated");

    const type = png.subarray(typeStart, dataStart).toString("ascii");
    const expectedCrc = png.readUInt32BE(dataEnd);
    assert.equal(crc32(png.subarray(typeStart, dataEnd)), expectedCrc, `${type} CRC is invalid`);

    if (type === "IHDR") {
      width = png.readUInt32BE(dataStart);
      height = png.readUInt32BE(dataStart + 4);
      colorType = png[dataStart + 9];
    }
    if (type === "IEND") {
      reachedEnd = true;
      assert.equal(crcEnd, png.length, "PNG contains trailing bytes");
      break;
    }
    offset = crcEnd;
  }

  assert.equal(width, 1024);
  assert.equal(height, 1024);
  assert.equal(colorType, 2, "App icon must be RGB without alpha");
  assert.equal(reachedEnd, true, "PNG is missing IEND");
});

test("Apple native sign-in preserves invite context and binds revocation credentials to the Apple identity", async () => {
  const [nativeApp, nativePage, appleServer, appleLinkRoute, retryMigration] = await Promise.all([
    read("ios/Atlas/AtlasApp.swift"),
    read("app/auth/native/page.tsx"),
    read("lib/apple-server.ts"),
    read("app/api/auth/apple/link/route.ts"),
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
  assert.match(appleServer, /expectedAppleSubject: string/);
  assert.match(appleServer, /!appleSubject \|\| appleSubject !== input\.expectedAppleSubject/);
  assert.match(appleLinkRoute, /if \(!expectedAppleSubject\)/);
  assert.match(retryMigration, /refresh_secret_id uuid/);
});

test("OAuth callback never guesses which provider owns a generic refresh token", async () => {
  const callback = await read("app/auth/callback/route.ts");
  assert.doesNotMatch(callback, /session\??\.provider_refresh_token/);
  assert.doesNotMatch(callback, /storeWebAppleProviderRefreshToken/);
});

test("native shell adds real app states and never offers embedded provider OAuth", async () => {
  const [nativeApp, ownerAuth, inviteAuth] = await Promise.all([
    read("ios/Atlas/AtlasApp.swift"),
    read("app/login/create-clinic-account.tsx"),
    read("app/join/[token]/join-auth.tsx"),
  ]);

  assert.match(nativeApp, /UIRefreshControl/);
  assert.match(nativeApp, /Atlas could not open/);
  assert.match(nativeApp, /Try again/);
  assert.match(nativeApp, /Try with sample data/);
  assert.match(nativeApp, /shouldOfferNativeAppleSignIn/);
  assert.match(nativeApp, /atlasInviteToken\(from: currentWebURL\)/);
  assert.match(ownerAuth, /apple: !embeddedIos && settings\.external\?\.apple === true/);
  assert.match(inviteAuth, /providers\.apple && embeddedIos === false/);
  assert.match(inviteAuth, /providers\.google && embeddedIos === false/);
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
  assert.match(accountAction, /auth\.signOut/);
  assert.match(accountPage, /Settings|DELETE/);
  assert.match(accountPage, /\/dashboard\/staff\?clinic=/);
  assert.match(accountPage, /\/dashboard\/settings\/delete/);
  assert.match(migration, /ON DELETE RESTRICT/i);
});

test("public App Store support and deletion pages remain present", async () => {
  const [home, support, privacy, deletion, manifest, release] = await Promise.all([
    read("app/page.tsx"),
    read("app/support/page.tsx"),
    read("app/privacy/page.tsx"),
    read("app/data-deletion/page.tsx"),
    read("app/manifest.ts"),
    read("docs/app-store-release.md"),
  ]);

  assert.match(home, /href="\/support"/);
  assert.match(home, /href="\/privacy"/);
  assert.match(home, /href="\/terms"/);
  assert.match(support, /Atlas Support/);
  assert.match(privacy, /Account and sign-in information/);
  assert.match(privacy, /Product analytics and diagnostics/);
  assert.match(privacy, /PostHog/);
  assert.match(deletion, /Settings → Account &amp; deletion/);
  assert.match(manifest, /name: "Atlas Appointments"/);
  assert.match(release, /## App Privacy questionnaire mapping/);
  assert.match(release, /## Age rating assumptions/);
  assert.match(release, /## Export compliance/);
  assert.match(release, /## Screenshot production checklist/);
  assert.match(release, /## TestFlight and release checklist/);
  assert.match(release, /scheduling,reception,reminders/);
});
