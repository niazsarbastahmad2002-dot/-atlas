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

test("web continuity keeps an encrypted current-day snapshot and stays read-only offline", () => {
  const component = source("app/dashboard/continuity-mode.tsx");

  assert.match(component, /navigator\.onLine === false/);
  assert.match(component, /OFFLINE/);
  assert.match(component, /indexedDB/);
  assert.match(component, /AES-GCM/);
  assert.match(component, /extractable|false,/);
  assert.match(component, /crypto\.subtle\.encrypt/);
  assert.match(component, /serviceWorker\.register\("\/atlas-sw\.js"/);
  assert.match(component, /window\.location\.reload\(\)/);
  assert.match(component, /pointer-events:none/);
  assert.match(component, /nativePost\(\{ type: "snapshot", snapshot: body\.snapshot \}\)/);
  assert.doesNotMatch(component, /patientPhone|phoneNumber|reminderConsent|accessToken|refreshToken|providerCredential/);
  assert.doesNotMatch(component, /method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/);
  assert.doesNotMatch(component, /offlineMutation|mutationQueue|replayQueue|queuedWrite/);
});

test("browser offline shell caches no dynamic or patient response", () => {
  const worker = source("public/atlas-sw.js");

  assert.match(worker, /ATLAS_OFFLINE_PAGE = "\/atlas-offline\.html"/);
  assert.match(worker, /request\.mode !== "navigate"/);
  assert.match(worker, /!url\.pathname\.startsWith\("\/dashboard"\)/);
  assert.match(worker, /await fetch\(request\)/);
  assert.match(worker, /caches\.match\(ATLAS_OFFLINE_PAGE\)/);
  assert.doesNotMatch(worker, /cache\.put\(|response\.clone\(|\/api\/continuity\/snapshot/);
});

test("browser offline page decrypts and renders only bounded current-day receptionist data", () => {
  const page = source("public/atlas-offline.html");

  assert.match(page, /atlas-continuity-v2/);
  assert.match(page, /crypto\.subtle\.decrypt/);
  assert.match(page, /AES-GCM/);
  assert.match(page, /snapshot\.day !== baghdadDay\(\)/);
  assert.match(page, /18 \* 60 \* 60 \* 1000/);
  assert.match(page, /snapshot\.appointments\.length > 500/);
  assert.match(page, /textContent/);
  assert.match(page, /OFFLINE · READ ONLY/);
  assert.doesNotMatch(page, /patientPhone|phoneNumber|reminderConsent|accessToken|refreshToken|providerCredential/);
  assert.doesNotMatch(page, /<form|<input|<textarea|method=["'](?:post|put|patch|delete)/i);
  assert.doesNotMatch(page, /fetch\(/);
});

test("browser continuity cache is cleared on login and auth exit paths", () => {
  const guard = source("app/components/continuity-cache-guard.tsx");
  const layout = source("app/layout.tsx");

  assert.match(guard, /deleteDatabase\(CONTINUITY_DB\)/);
  assert.match(guard, /pathname === "\/login"/);
  assert.match(guard, /pathname\.startsWith\("\/auth\/"\)/);
  assert.match(guard, /pathname\.startsWith\("\/onboarding\/"\)/);
  assert.match(guard, /CONTINUITY_ACTIVE_MARKER, "0"/);
  assert.match(layout, /<ContinuityCacheGuard \/>/);
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
  assert.match(component, /Reconnect always reloads authoritative server state/);
  assert.doesNotMatch(`${nativeApp}\n${nativeStore}\n${component}`, /offlineMutation|mutationQueue|replayQueue|queuedWrite/);
});

test("emergency export tools stay out of everyday clinic settings", () => {
  const simplicity = source("app/atlas-simple-core.css");
  const settings = source("app/dashboard/settings/page.tsx");

  assert.match(settings, /className="settings-export-form"/);
  assert.match(simplicity, /\.settings-export-form\s*\{\s*display:\s*none;/);
});

test("continuity snapshot never substitutes another clinic for an explicit unavailable clinic", () => {
  const route = source("app/api/continuity/snapshot/route.ts");
  const component = source("app/dashboard/continuity-mode.tsx");

  assert.match(route, /if \(requestedClinicId && !isUuid\(requestedClinicId\)\)[\s\S]*clear: true[\s\S]*clinic_invalid/);
  assert.match(route, /const clinic = requestedClinicId[\s\S]*clinics\.find\(\(candidate\) => candidate\.id === requestedClinicId\)[\s\S]*: clinics\[0\]/);
  assert.match(route, /if \(!clinic\)[\s\S]*clear: true[\s\S]*clinic_unavailable/);
  assert.doesNotMatch(route, /clinics\.find\(\(candidate\) => candidate\.id === requestedClinicId\) \?\? clinics\[0\]/);
  assert.match(component, /if \(body\?\.clear === true\)[\s\S]*clearBrowserContinuityCache\(\)/);
});

test("continuity access is verified before patient data is loaded", () => {
  const route = source("app/api/continuity/snapshot/route.ts");

  const guard = route.indexOf("const hasClinicAccess = clinic.owner_id === userData.user.id");
  const appointments = route.indexOf('.from("appointments")');
  assert.ok(guard >= 0);
  assert.ok(appointments > guard);
});



test("offline continuity disables write controls while preserving local microphone stop actions", () => {
  const component = source("app/dashboard/continuity-mode.tsx");
  const ai = source("app/dashboard/assistant/atlas-ai-client-v4.tsx");

  assert.match(component, /const disabledControls = new Map/);
  assert.match(component, /data-atlas-offline-local-action/);
  assert.match(component, /if \(!control\.disabled\) control\.disabled = true/);
  assert.match(component, /new MutationObserver\(lockOfflineControls\)/);
  assert.match(component, /attributes: true/);
  assert.match(component, /attributeFilter: \["disabled", "data-atlas-offline-local-action"\]/);
  assert.match(component, /control\.disabled = wasDisabled/);
  assert.match(component, /unlockOfflineControls\(\)/);
  assert.ok((ai.match(/data-atlas-offline-local-action/g) ?? []).length >= 4);
  assert.match(ai, /stopCapture\(navigator\.onLine===false\)/);
});


test("continuity cache cleanup still clears IndexedDB when localStorage is blocked", () => {
  const component = source("app/dashboard/continuity-mode.tsx");
  const guard = source("app/components/continuity-cache-guard.tsx");

  assert.match(component, /function writeContinuityMarker\(value: "0" \| "1"\)[\s\S]*try \{[\s\S]*localStorage\.setItem[\s\S]*catch \{/);
  assert.match(component, /clearBrowserContinuityCache\(\)[\s\S]*writeContinuityMarker\("0"\)[\s\S]*indexedDB/);
  assert.match(guard, /localStorage\.setItem\(CONTINUITY_ACTIVE_MARKER, "0"\)[\s\S]*catch \{[\s\S]*if \(!\("indexedDB" in window\)\) return;[\s\S]*deleteDatabase\(CONTINUITY_DB\)/);
});


test("continuity scopes stale responses and serializes protected cache mutations", () => {
  const component = source("app/dashboard/continuity-mode.tsx");

  assert.match(component, /const snapshotRequestRef = useRef\(0\)/);
  assert.match(component, /const snapshotScopeRef = useRef\(0\)/);
  assert.match(component, /const clearedScopeRef = useRef<number \| null>\(null\)/);
  assert.match(component, /const snapshotMutationRef = useRef<Promise<void>>\(Promise\.resolve\(\)\)/);
  assert.match(component, /const scopeVersion = \+\+snapshotScopeRef\.current/);
  assert.match(component, /if \(scopeVersion !== snapshotScopeRef\.current\) return/);
  assert.match(component, /clearedScopeRef\.current = scopeVersion/);
  assert.match(component, /await clearBrowserContinuityCache\(\)/);
  assert.ok((component.match(/snapshotMutationRef\.current = snapshotMutationRef\.current/g) ?? []).length >= 2);
  assert.match(component, /requestId !== snapshotRequestRef\.current/);
  assert.match(component, /clearedScopeRef\.current === scopeVersion/);
  assert.match(component, /await persistBrowserSnapshot\(snapshot\)/);
  assert.match(component, /snapshotScopeRef\.current \+= 1/);
  assert.match(component, /snapshotRequestRef\.current \+= 1/);
  assert.ok(
    component.indexOf("if (body?.clear === true)")
      < component.indexOf("requestId !== snapshotRequestRef.current"),
    "same-scope authorization clears must not be discarded merely because a newer refresh started",
  );
});
