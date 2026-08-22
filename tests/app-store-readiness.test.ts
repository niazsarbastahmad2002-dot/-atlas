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
    read("ios/project.yml"), read("ios/Atlas/Atlas.entitlements"), read("ios/Atlas/PrivacyInfo.xcprivacy")]);
  assert.match(project, /PRODUCT_BUNDLE_IDENTIFIER: com\.atlasappointments\.app/);
  assert.match(project, /ASSETCATALOG_COMPILER_APPICON_NAME: AppIcon/);
  assert.match(project, /ATLAS_ASSOCIATED_DOMAIN: atlasappointments\.com/);
  assert.match(project, /ITSAppUsesNonExemptEncryption: false/);
  assert.match(project, /UIColorName: LaunchBackground/);
  assert.match(project, /UIImageName: LaunchMark/);
  assert.doesNotMatch(project, /CFBundleURLTypes/);
  assert.match(entitlements, /com\.apple\.developer\.associated-domains/);
  assert.match(entitlements, /applinks:\$\(ATLAS_ASSOCIATED_DOMAIN\)/);
  assert.match(privacy, /NSPrivacyAccessedAPICategoryUserDefaults/);
  assert.match(privacy, /CA92\.1/);
  assert.match(privacy, /<key>NSPrivacyTracking<\/key>\s*<false\/>/);
});

test("App Store icon is a complete opaque 1024px PNG", async () => {
  const png = await readBytes("ios/Atlas/Assets.xcassets/AppIcon.appiconset/atlas-app-icon.png");
  assert.deepEqual([...png.subarray(0, 8)], [137,80,78,71,13,10,26,10]);
  let offset=8,width=0,height=0,colorType=-1,reachedEnd=false;
  while(offset<png.length){assert.ok(offset+12<=png.length);const length=png.readUInt32BE(offset);const typeStart=offset+4,dataStart=typeStart+4,dataEnd=dataStart+length,crcEnd=dataEnd+4;assert.ok(crcEnd<=png.length);const type=png.subarray(typeStart,dataStart).toString("ascii");assert.equal(crc32(png.subarray(typeStart,dataEnd)),png.readUInt32BE(dataEnd));if(type==="IHDR"){width=png.readUInt32BE(dataStart);height=png.readUInt32BE(dataStart+4);colorType=png[dataStart+9];}if(type==="IEND"){reachedEnd=true;assert.equal(crcEnd,png.length);break;}offset=crcEnd;}
  assert.equal(width,1024);assert.equal(height,1024);assert.equal(colorType,2);assert.equal(reachedEnd,true);
});

test("phone-first iOS no longer exposes native Apple sign-in while historical Apple cleanup remains identity-bound", async () => {
  const [nativeApp, appleServer, appleLinkRoute, retryMigration] = await Promise.all([read("ios/Atlas/AtlasApp.swift"),read("lib/apple-server.ts"),read("app/api/auth/apple/link/route.ts"),read("supabase/migrations/20260820225813_harden_apple_revocation_retry.sql")]);
  assert.match(nativeApp, /Continue with WhatsApp/); assert.match(nativeApp, /Verify WhatsApp and join/);
  assert.doesNotMatch(nativeApp,/SignInWithAppleButton/);assert.doesNotMatch(nativeApp,/AuthenticationServices/);
  assert.match(appleServer,/https:\/\/appleid\.apple\.com\/auth\/token/);assert.match(appleServer,/https:\/\/appleid\.apple\.com\/auth\/revoke/);
  assert.match(appleServer,/store_apple_refresh_token_service/);assert.match(appleServer,/get_apple_revocation_credential_service/);assert.match(appleServer,/delete_apple_refresh_secret_service/);assert.match(appleServer,/expectedAppleSubject: string/);assert.match(appleServer,/!appleSubject \|\| appleSubject !== input\.expectedAppleSubject/);assert.match(appleLinkRoute,/if \(!expectedAppleSubject\)/);assert.match(retryMigration,/refresh_secret_id uuid/);
});

test("OAuth callback never guesses which provider owns a generic refresh token", async()=>{const callback=await read("app/auth/callback/route.ts");assert.doesNotMatch(callback,/session\??\.provider_refresh_token/);assert.doesNotMatch(callback,/storeWebAppleProviderRefreshToken/);});

test("native shell has real app states and every visible web auth entry is WhatsApp-first",async()=>{const[nativeApp,ownerAuth,inviteAuth]=await Promise.all([read("ios/Atlas/AtlasApp.swift"),read("app/login/login-form.tsx"),read("app/join/[token]/join-auth.tsx")]);assert.match(nativeApp,/UIRefreshControl/);assert.match(nativeApp,/Atlas could not open/);assert.match(nativeApp,/Try again/);assert.match(nativeApp,/Try with sample data/);assert.match(nativeApp,/atlasInviteToken\(from: url\)/);assert.match(nativeApp,/atlasRetryURL\(currentURL: URL\?, initialURL: URL\)/);assert.match(nativeApp,/components\.fragment = nil/);assert.match(nativeApp,/destination = retryURL/);assert.doesNotMatch(nativeApp,/shouldOfferNativeAppleSignIn/);assert.match(ownerAuth,/\/api\/auth\/whatsapp\/start/);assert.match(ownerAuth,/\/api\/auth\/whatsapp\/verify/);assert.match(ownerAuth,/Send code to WhatsApp/);assert.doesNotMatch(ownerAuth,/signInWithOAuth|type="email"|signInWithOtp/);assert.match(inviteAuth,/LoginForm/);assert.doesNotMatch(inviteAuth,/signInWithOAuth|type="email"|signInWithOtp/);});

test("account deletion is in-app, retry-safe, deletes owned clinics, then deletes the identity",async()=>{const[accountAction,accountPage,migration]=await Promise.all([read("app/dashboard/settings/account/actions.ts"),read("app/dashboard/settings/account/page.tsx"),read("supabase/migrations/20260820223722_protect_clinic_ownership_on_account_delete.sql")]);assert.match(accountAction,/getStoredAppleRevocationCredential/);assert.match(accountAction,/revokeAppleAuthorization/);assert.match(accountAction,/cleanupAppleRefreshSecret/);assert.match(accountAction,/from\("clinics"\)[\s\S]*\.delete\(\)[\s\S]*\.eq\("owner_id", userId\)/);assert.match(accountAction,/auth\.admin\.deleteUser\(userId\)/);assert.ok(accountAction.indexOf('from("clinics")')<accountAction.indexOf("auth.admin.deleteUser"));assert.ok(accountAction.indexOf("auth.admin.deleteUser")<accountAction.indexOf("revokeAppleAuthorization(appleCredential)"));assert.match(accountAction,/auth\.signOut/);assert.match(accountPage,/Delete Atlas account permanently/);assert.match(accountPage,/every clinic I own/);assert.match(accountPage,/Type DELETE to confirm/);assert.match(migration,/ON DELETE RESTRICT/i);});

test("public App Store support and deletion pages remain present",async()=>{const[home,support,privacy,deletion,manifest,release]=await Promise.all([read("app/page.tsx"),read("app/support/page.tsx"),read("app/privacy/page.tsx"),read("app/data-deletion/page.tsx"),read("app/manifest.ts"),read("docs/app-store-release.md")]);assert.match(home,/href="\/support"/);assert.match(home,/href="\/privacy"/);assert.match(home,/href="\/terms"/);assert.match(support,/Atlas Support/);assert.match(privacy,/Account and sign-in information/);assert.match(privacy,/Product analytics and diagnostics/);assert.match(privacy,/PostHog/);assert.match(deletion,/Settings → Account &amp; deletion/);assert.match(manifest,/name: "Atlas Appointments"/);assert.match(release,/## App Privacy questionnaire mapping/);assert.match(release,/## Age rating assumptions/);assert.match(release,/## Export compliance/);assert.match(release,/## Screenshot production checklist/);assert.match(release,/## TestFlight and release checklist/);assert.match(release,/scheduling,reception,reminders/);});
