import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("continuity snapshot stays RLS-bound and deliberately minimal", () => {
  const route = source("app/api/continuity/snapshot/route.ts");

  assert.match(route, /createClient\(\)/);
  assert.doesNotMatch(route, /createAdminClient|service_role|SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(route, /\.from\("appointments"\)/);
  assert.match(route, /select\("id, patient_name, doctor_id, doctor_name, appointment_at, created_at, status"\)/);
  assert.doesNotMatch(route, /patient_phone|reminder_consent|reminder_language|message_content|access_token/);
  assert.match(route, /Cache-Control": "no-store"/);
  assert.match(route, /const today = baghdadDate\.format\(now\)/);
  assert.match(route, /\.limit\(500\)/);
});

test("web continuity never persists patient data and becomes read-only while offline", () => {
  const component = source("app/dashboard/continuity-mode.tsx");

  assert.match(component, /navigator\.onLine === false/);
  assert.match(component, /OFFLINE/);
  assert.match(component, /Changes from other staff may not appear until connection returns/);
  assert.match(component, /window\.location\.reload\(\)/);
  assert.match(component, /pointer-events:none/);
  assert.match(component, /nativePost\(\{ type: "snapshot", snapshot: body\.snapshot \}\)/);
  assert.doesNotMatch(component, /localStorage|sessionStorage|indexedDB|serviceWorker|caches\.open/);
  assert.doesNotMatch(component, /POST|PUT|PATCH|DELETE/);
});

test("native continuity cache is protected, scoped, expiring and contains no phone or secret field", () => {
  const nativeStore = source("ios/Atlas/Continuity.swift");

  assert.match(nativeStore, /completeFileProtection/);
  assert.match(nativeStore, /FileProtectionType\.complete/);
  assert.match(nativeStore, /isExcludedFromBackup = true/);
  assert.match(nativeStore, /clearIfScopeChanged/);
  assert.match(nativeStore, /snapshot\.day == baghdadDay\(for: now\)/);
  assert.match(nativeStore, /appointments\.count <= 500/);
  assert.doesNotMatch(nativeStore, /patientPhone|phoneNumber|accessToken|refreshToken|providerCredential/);
});

test("native offline surface is read-only and only trusts Atlas main-frame bridge messages", () => {
  const nativeApp = source("ios/Atlas/AtlasApp.swift");
  const offlineStart = nativeApp.indexOf("private struct AtlasContinuityOfflineView");
  const offlineEnd = nativeApp.indexOf("struct AtlasWebView", offlineStart);
  assert.ok(offlineStart >= 0 && offlineEnd > offlineStart);
  const offlineView = nativeApp.slice(offlineStart, offlineEnd);

  assert.match(offlineView, /Read-only continuity view/);
  assert.match(offlineView, /Showing Atlas as of/);
  assert.doesNotMatch(offlineView, /Button\(/);
  assert.match(nativeApp, /message\.frameInfo\.isMainFrame/);
  assert.match(nativeApp, /securityOrigin\.host\.lowercased\(\)/);
  assert.match(nativeApp, /atlasUniversalLinkHosts\.contains/);
  assert.match(nativeApp, /atlasShouldClearContinuity/);
  assert.match(nativeApp, /url\.path == "\/login"/);
});

test("reconnect reloads live Atlas instead of replaying stale local writes", () => {
  const nativeApp = source("ios/Atlas/AtlasApp.swift");
  const nativeStore = source("ios/Atlas/Continuity.swift");
  const component = source("app/dashboard/continuity-mode.tsx");

  assert.match(nativeApp, /recoveringFromOffline/);
  assert.match(nativeApp, /atlasRetryURL\(currentURL: currentWebURL/);
  assert.match(nativeApp, /webReloadID = UUID\(\)/);
  assert.match(component, /A full live reload is intentional after reconnect/);
  assert.doesNotMatch(`${nativeApp}\n${nativeStore}\n${component}`, /offlineMutation|mutationQueue|replayQueue|queuedWrite/);
});
