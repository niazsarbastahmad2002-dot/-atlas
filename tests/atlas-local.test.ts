import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const logic = () => [
  source("public/atlas-local-copy.js"),
  source("public/atlas-local-base.js"),
  source("public/atlas-local-core.js"),
  source("public/atlas-local-polish.js"),
  source("public/atlas-local-app.js"),
  source("public/atlas-local-after.js"),
].join("\n");

function arrayValue(code: string, name: string) {
  const match = code.match(new RegExp(`const ${name}=([^;]+);`));
  assert.ok(match, `${name} should exist`);
  return Function(`return (${match[1]})`)();
}

test("Atlas Local loader boots every offline module in a deterministic order", () => {
  const shell = source("public/atlas-local.html");
  const loader = source("public/atlas-local.js");
  assert.match(shell, /<script src="\/atlas-local\.js" defer><\/script>/);
  for (const part of ["copy", "base", "core", "polish", "app", "after"]) {
    assert.match(loader, new RegExp(`/atlas-local-${part}\\.js`));
  }
  assert.match(loader, /for \(const src of scripts\) await load\(src\)/);
  assert.match(loader, /restore\.disabled = true/);
  assert.doesNotThrow(() => new Function(loader));
  assert.doesNotThrow(() => new Function(logic()));
});

test("Atlas Local stays device-only and contains no online clinic features", () => {
  const shell = source("public/atlas-local.html");
  const local = `${shell}\n${logic()}`;
  assert.match(local, /SAVED ON THIS DEVICE/);
  assert.doesNotMatch(local, /Atlas Online|Open Atlas Online|INTERNET AVAILABLE|navigator\.onLine|connection-status|clinicTimingMinutes|data-timing/i);
  assert.doesNotMatch(local, /supabase|service_role|SUPABASE_SERVICE_ROLE_KEY|graph\.facebook|connect\.facebook|whatsapp/i);
  assert.doesNotMatch(logic(), /fetch\s*\(|XMLHttpRequest|WebSocket/);
  assert.doesNotMatch(shell, /href="\/login"|href="\/dashboard"/);
});

test("Atlas Local encrypts durable device data behind the clinic PIN", () => {
  const local = logic();
  assert.match(local, /DB_NAME="atlas-local-v1"/);
  assert.match(local, /ITERATIONS=310000/);
  assert.match(local, /PBKDF2/);
  assert.match(local, /AES-GCM/);
  assert.match(local, /crypto\.subtle\.encrypt/);
  assert.match(local, /crypto\.subtle\.decrypt/);
  assert.match(local, /\^\\d\{6,12\}\$/);
  assert.match(local, /MAX_APPOINTMENTS=5000/);
  assert.match(local, /navigator\.storage && navigator\.storage\.persist/);
});

test("older Atlas Local schemas upgrade without losing appointment data", () => {
  const local = logic();
  assert.match(local, /if \(value\.version === 1\)/);
  assert.match(local, /if \(value\.version === 2\)/);
  assert.match(local, /version: 3/);
  assert.match(local, /appointments: value\.appointments/);
  assert.match(local, /history: value\.history/);
  assert.match(local, /entry\.action !== "timingUpdated"/);
});

test("Atlas Local keeps only useful receptionist operations", () => {
  const shell = source("public/atlas-local.html");
  for (const id of ["stat-waiting", "schedule-search", "doctor-filter", "status-filter", "edit-dialog", "backup-button", "restore-button", "print-button"]) {
    assert.match(shell, new RegExp(`id="${id}"`));
  }
  const local = logic();
  assert.match(local, /duplicateAppointment/);
  assert.match(local, /queueMap/);
  assert.match(local, /openEdit/);
  assert.match(local, /saveEdit/);
  assert.match(`${shell}\n${local}`, /scheduling only/i);
  assert.doesNotMatch(`${shell}\n${local}`, /diagnosis|medication|prescription|symptom|clinical_note|medical_history/i);
});

test("appointment interval drives the next local slot without wrapping to another day", () => {
  const local = logic();
  assert.match(source("public/atlas-local.html"), /id="new-doctor-interval"/);
  assert.match(local, /doctorById\(doctorId\)\.intervalMinutes/);
  assert.match(local, /appointment-time.*addMinutes/s);
  assert.match(local, /if \(total < 0 \|\| total >= 1440\) return ""/);
});

test("status changes cannot reactivate an appointment into a doctor collision", () => {
  assert.match(source("public/atlas-local-polish.js"), /ACTIVE\.has\(next\) && duplicateAppointment\(appointment\.day, appointment\.time, appointment\.doctorId, appointment\.id\)/);
});

test("local writes keep rollback protection and a bounded activity history", () => {
  const local = logic();
  assert.match(local, /MAX_HISTORY=3000/);
  assert.match(local, /function addHistory/);
  assert.match(local, /state\.history\.push/);
  assert.match(local, /state\.history = state\.history\.slice\(-MAX_HISTORY\)/);
  assert.match(local, /async function saveMutation/);
  assert.match(local, /const before = clone\(state\)/);
  assert.match(local, /state = before/);
});

test("iPad resume cannot bypass Atlas Local auto-lock", () => {
  const after = source("public/atlas-local-after.js");
  assert.match(after, /atlasLocalInactivityExpired/);
  assert.match(after, /atlasLocalEnforceAutoLock/);
  assert.match(after, /visibilitychange/);
  assert.match(after, /pageshow/);
  assert.match(after, /document\.removeEventListener\(eventName, atlasLocalLegacyTouchActivity\)/);
  assert.match(after, /document\.addEventListener\(eventName, touchActivity/);
});

test("backup stays encrypted and restore uses a masked in-app PIN before replacing data", () => {
  const local = logic();
  const after = source("public/atlas-local-after.js");
  assert.match(local, /BACKUP_MARKER="atlas-local-backup-v1"/);
  assert.match(local, /meta: currentMeta, payload/);
  assert.doesNotMatch(local, /meta: currentMeta, payload, state/);
  assert.match(after, /id="restore-pin" type="password"/);
  assert.match(after, /file\.size > 12 \* 1024 \* 1024/);
  assert.match(after, /restoredState = sanitizeState\(await decryptState/);
  assert.match(after, /window\.confirm\(t\("restoreReplace"\)\)/);
  const decryptAt = after.indexOf("restoredState = sanitizeState(await decryptState");
  const writeAt = after.indexOf("await writeRecords([restoredMeta, restoredPayload])");
  assert.ok(decryptAt >= 0 && writeAt > decryptAt, "restore must validate before overwriting local records");
  assert.match(local, /indexedDB\.deleteDatabase\(DB_NAME\)/);
});

test("all four Local languages cover every visible translated key", () => {
  const copy = source("public/atlas-local-copy.js");
  const keys = arrayValue(copy, "I18N_KEYS");
  for (const name of ["EN_VALUES", "KU_VALUES", "BD_VALUES", "AR_VALUES"]) {
    const values = arrayValue(copy, name);
    assert.equal(values.length, keys.length, `${name} should cover every Atlas Local label`);
  }
  const visible = new Set([...source("public/atlas-local.html").matchAll(/data-t="([^"]+)"/g)].map((match) => match[1]));
  for (const key of visible) assert.ok(keys.includes(key), `missing translation key ${key}`);
  const polish = source("public/atlas-local-polish.js");
  assert.match(polish, /شاشەی سەرەکی/);
  assert.match(polish, /شاشەیا سەرەکی/);
  assert.match(polish, /پاشەکەوتی پارێزراو/);
  assert.match(polish, /فایلێ پاراستی/);
  assert.match(source("public/atlas-local-base.js"), /document\.documentElement\.dir = locale === "en" \? "ltr" : "rtl"/);
});

test("archived doctors stay readable but cannot be newly selected", () => {
  const after = source("public/atlas-local-after.js");
  assert.match(after, /state\.doctors\.filter\(\(doctor\) => !doctor\.active\)/);
  assert.match(after, /option\.disabled = true/);
  assert.match(source("public/atlas-local-core.js"), /fillDoctorSelect\(el\("edit-doctor"\), false, true\)/);
});

test("service worker installs every Local module and refreshes safely online", () => {
  const worker = source("public/atlas-sw.js");
  assert.match(worker, /atlas-offline-shell-v6/);
  for (const part of ["copy", "base", "core", "polish", "app", "after"]) {
    assert.match(worker, new RegExp(`/atlas-local-${part}\\.js`));
  }
  assert.match(worker, /networkFirstLocalAsset/);
  assert.match(worker, /cache: "no-store"/);
  assert.match(worker, /cache\.match\(request, \{ ignoreSearch: true \}\)/);
  assert.doesNotMatch(worker, /cache\.put\(|response\.clone\(/);
});

test("Atlas Online and Atlas Local remain peer choices on the Atlas entry", () => {
  const home = source("app/page.tsx");
  assert.match(home, />Atlas Online</);
  assert.match(home, />Atlas Local</);
  assert.match(home, /href="\/atlas-local\.html"/);
  assert.match(home, /Choose Atlas mode/);
});

test("Atlas Local installs as its own standalone PWA", () => {
  const manifest = JSON.parse(source("public/atlas-local.webmanifest"));
  assert.equal(manifest.name, "Atlas Local");
  assert.equal(manifest.start_url, "/atlas-local.html");
  assert.equal(manifest.display, "standalone");
});
