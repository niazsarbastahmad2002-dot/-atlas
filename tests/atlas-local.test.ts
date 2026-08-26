import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function dictionaryKeys(logic: string, name: string) {
  const match = logic.match(new RegExp(`const ${name} = \\{([\\s\\S]*?)\\n\\};`));
  assert.ok(match, `${name} dictionary should exist`);
  return new Set([...match[1].matchAll(/^  ([A-Za-z_][A-Za-z0-9_]*):/gm)].map((item) => item[1]));
}

test("Atlas Local browser script parses and is loaded by its separate app shell", () => {
  const shell = source("public/atlas-local.html");
  const logic = source("public/atlas-local.js");
  assert.match(shell, /<script src="\\/atlas-local\\.js" defer><\\/script>/);
  assert.doesNotThrow(() => new Function(logic));
});

test("Atlas Local is a genuinely device-only workspace with no online product controls", () => {
  const shell = source("public/atlas-local.html");
  const logic = source("public/atlas-local.js");
  const local = `${shell}\n${logic}`;
  assert.match(local, /SAVED ON THIS DEVICE/);
  assert.doesNotMatch(local, /Atlas Online|Open Atlas Online|INTERNET AVAILABLE|navigator\\.onLine|connection-status|clinicTimingMinutes|data-timing/i);
  assert.doesNotMatch(local, /supabase|service_role|SUPABASE_SERVICE_ROLE_KEY|graph\\.facebook|connect\\.facebook|whatsapp/i);
  assert.doesNotMatch(logic, /fetch\\s*\\(|XMLHttpRequest|WebSocket/);
  assert.doesNotMatch(shell, /href="\\/login"|href="\\/dashboard"/);
});

test("Atlas Local encrypts the complete local workspace behind a PIN", () => {
  const logic = source("public/atlas-local.js");
  assert.match(logic, /const DB_NAME = "atlas-local-v1"/);
  assert.match(logic, /PBKDF2/);
  assert.match(logic, /const ITERATIONS = 310000/);
  assert.match(logic, /AES-GCM/);
  assert.match(logic, /crypto\\.subtle\\.encrypt/);
  assert.match(logic, /crypto\\.subtle\\.decrypt/);
  assert.match(logic, /\\^\\\\d\\\{6,12\\\}\\$/);
  assert.match(logic, /const MAX_APPOINTMENTS = 5000/);
  assert.match(logic, /navigator\\.storage && navigator\\.storage\\.persist/);
});

test("Atlas Local upgrades both older local schemas without losing appointments", () => {
  const logic = source("public/atlas-local.js");
  assert.match(logic, /if \(value\\.version === 1\)/);
  assert.match(logic, /if \(value\\.version === 2\)/);
  assert.match(logic, /version: 3/);
  assert.match(logic, /appointments: value\\.appointments/);
  assert.match(logic, /history: value\\.history/);
  assert.match(logic, /entry\\.action !== "timingUpdated"/);
});

test("Atlas Local keeps only useful offline receptionist operations", () => {
  const shell = source("public/atlas-local.html");
  const logic = source("public/atlas-local.js");
  const local = `${shell}\n${logic}`;
  assert.match(shell, /id="stat-waiting"/);
  assert.match(shell, /id="schedule-search"/);
  assert.match(shell, /id="doctor-filter"/);
  assert.match(shell, /id="status-filter"/);
  assert.match(shell, /id="edit-dialog"/);
  assert.match(shell, /id="backup-button"/);
  assert.match(shell, /id="restore-button"/);
  assert.match(shell, /id="print-button"/);
  assert.match(logic, /duplicateAppointment/);
  assert.match(logic, /queueMap/);
  assert.match(logic, /openEdit/);
  assert.match(logic, /saveEdit/);
  assert.match(local, /scheduling only/i);
  assert.doesNotMatch(local, /diagnosis|medication|prescription|symptom|clinical_note|medical_history/i);
});

test("doctor appointment interval now does real offline work instead of being decorative", () => {
  const shell = source("public/atlas-local.html");
  const logic = source("public/atlas-local.js");
  assert.match(shell, /id="new-doctor-interval"/);
  assert.match(logic, /function addMinutes/);
  assert.match(logic, /doctorById\\(doctorId\\)\\.intervalMinutes/);
  assert.match(logic, /appointment-time.*addMinutes/s);
  assert.match(logic, /appointment\\.doctorId === doctorId/);
});

test("Atlas Local keeps a bounded encrypted local activity trail", () => {
  const logic = source("public/atlas-local.js");
  assert.match(logic, /const MAX_HISTORY = 3000/);
  assert.match(logic, /function addHistory/);
  assert.match(logic, /state\\.history\\.push/);
  assert.match(logic, /state\\.history = state\\.history\\.slice\\(-MAX_HISTORY\\)/);
  assert.match(logic, /statusChanged/);
  assert.match(logic, /doctorAdded/);
  assert.match(logic, /clinicCreated/);
});

test("Atlas Local auto-lock starts immediately after create or unlock and refreshes on activity", () => {
  const logic = source("public/atlas-local.js");
  assert.match(logic, /function scheduleAutoLock/);
  assert.match(logic, /function touchActivity/);
  assert.match(logic, /renderWorkspace\\(\\);\n    touchActivity\\(\\);/);
  assert.match(logic, /document\\.addEventListener\\(eventName, touchActivity/);
});

test("Atlas Local mutations roll back cleanly when device persistence fails", () => {
  const logic = source("public/atlas-local.js");
  assert.match(logic, /async function saveMutation/);
  assert.match(logic, /const before = clone\\(state\\)/);
  assert.match(logic, /state = before/);
  assert.match(logic, /showError\\(errorId, t\\("saveFailed"\\)\\)/);
});

test("Atlas Local backup remains encrypted and restore verifies PIN before replacing current data", () => {
  const logic = source("public/atlas-local.js");
  assert.match(logic, /const BACKUP_MARKER = "atlas-local-backup-v1"/);
  assert.match(logic, /meta: currentMeta, payload/);
  assert.doesNotMatch(logic, /meta: currentMeta, payload, state/);
  assert.match(logic, /validBackup/);
  assert.match(logic, /restoredState = sanitizeState\\(await decryptState/);
  assert.match(logic, /window\\.confirm\\(t\\("restoreReplace"\\)\\)/);
  const decryptAt = logic.indexOf("restoredState = sanitizeState(await decryptState");
  const writeAt = logic.indexOf("await writeRecords([restoredMeta, restoredPayload])");
  assert.ok(decryptAt >= 0 && writeAt > decryptAt, "restore must decrypt and validate before overwriting local records");
  assert.match(logic, /indexedDB\\.deleteDatabase\\(DB_NAME\\)/);
});

test("all four Atlas Local languages cover every visible translated label without English fallback spreading", () => {
  const shell = source("public/atlas-local.html");
  const logic = source("public/atlas-local.js");
  const visibleKeys = new Set([...shell.matchAll(/data-t="([^"]+)"/g)].map((item) => item[1]));
  for (const name of ["EN", "KU", "BD", "AR"]) {
    const keys = dictionaryKeys(logic, name);
    for (const key of visibleKeys) assert.ok(keys.has(key), `${name} is missing ${key}`);
  }
  assert.doesNotMatch(logic, /\\{\\.\\.\\.EN/);
  assert.match(logic, /document\\.documentElement\\.dir = locale === "en" \\? "ltr" : "rtl"/);
  assert.match(shell, /\\[dir="rtl"\\] \\.brand\\{direction:ltr\\}/);
});

test("Atlas Local prefers fresh app assets online and falls back to installed files offline", () => {
  const worker = source("public/atlas-sw.js");
  assert.match(worker, /atlas-offline-shell-v5/);
  assert.match(worker, /ATLAS_LOCAL_PAGE = "\\/atlas-local\\.html"/);
  assert.match(worker, /ATLAS_LOCAL_SCRIPT = "\\/atlas-local\\.js"/);
  assert.match(worker, /ATLAS_LOCAL_MANIFEST = "\\/atlas-local\\.webmanifest"/);
  assert.match(worker, /networkFirstLocalAsset/);
  assert.match(worker, /cache: "no-store"/);
  assert.match(worker, /cache\\.match\\(request, \\{ ignoreSearch: true \\}\\)/);
  assert.doesNotMatch(worker, /cache\\.put\\(|response\\.clone\\(/);
  assert.match(worker, /url\\.pathname\\.startsWith\\("\\/dashboard"\\)/);
  assert.match(worker, /ATLAS_OFFLINE_PAGE/);
});

test("Atlas Online and Atlas Local remain peer choices on the public Atlas entry", () => {
  const home = source("app/page.tsx");
  assert.match(home, />Atlas Online</);
  assert.match(home, />Atlas Local</);
  assert.match(home, /href="\\/atlas-local\\.html"/);
  assert.match(home, /Choose Atlas mode/);
});

test("Atlas Local installs as its own PWA entry instead of opening the online dashboard", () => {
  const manifest = JSON.parse(source("public/atlas-local.webmanifest"));
  assert.equal(manifest.name, "Atlas Local");
  assert.equal(manifest.start_url, "/atlas-local.html");
  assert.equal(manifest.display, "standalone");
});
