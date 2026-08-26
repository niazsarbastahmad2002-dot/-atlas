import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Atlas Local browser script parses and is loaded by its separate app shell", () => {
  const shell = source("public/atlas-local.html");
  const logic = source("public/atlas-local.js");
  assert.match(shell, /<script src="\/atlas-local\.js" defer><\/script>/);
  assert.doesNotThrow(() => new Function(logic));
});

test("Atlas Local remains a hard-separated device-only product", () => {
  const local = `${source("public/atlas-local.html")}\n${source("public/atlas-local.js")}`;
  assert.match(local, /Local and Online stay separate/);
  assert.match(local, /Nothing is sent to Atlas servers/);
  assert.doesNotMatch(local, /supabase|service_role|SUPABASE_SERVICE_ROLE_KEY|graph\.facebook|connect\.facebook|whatsapp/i);
  assert.doesNotMatch(source("public/atlas-local.js"), /fetch\s*\(|XMLHttpRequest|WebSocket/);
});

test("Atlas Local encrypts the complete local workspace behind a PIN", () => {
  const logic = source("public/atlas-local.js");
  assert.match(logic, /const DB_NAME="atlas-local-v1"/);
  assert.match(logic, /PBKDF2/);
  assert.match(logic, /ITERATIONS=310000/);
  assert.match(logic, /AES-GCM/);
  assert.match(logic, /crypto\.subtle\.encrypt/);
  assert.match(logic, /crypto\.subtle\.decrypt/);
  assert.match(logic, /\^\\d\{6,12\}\$/);
  assert.match(logic, /MAX_APPOINTMENTS=5000/);
});

test("Atlas Local upgrades old v1 clinics without losing their appointments", () => {
  const logic = source("public/atlas-local.js");
  assert.match(logic, /if\(v\.version===1\)/);
  assert.match(logic, /doctorName\|\|"Doctor"/);
  assert.match(logic, /appointments:\(v\.appointments\|\|\[\]\)\.map/);
  assert.match(logic, /version:2/);
});

test("Atlas Local provides rich receptionist operations while staying scheduling-only", () => {
  const shell = source("public/atlas-local.html");
  const logic = source("public/atlas-local.js");
  const local = `${shell}\n${logic}`;
  assert.match(shell, /id="stat-waiting"/);
  assert.match(shell, /id="schedule-search"/);
  assert.match(shell, /id="doctor-filter"/);
  assert.match(shell, /id="status-filter"/);
  assert.match(shell, /id="edit-dialog"/);
  assert.match(logic, /duplicateAppointment/);
  assert.match(logic, /queueMap/);
  assert.match(logic, /openEdit/);
  assert.match(logic, /saveEdit/);
  assert.match(logic, /clinicTimingMinutes/);
  assert.match(local, /scheduling-only/i);
  assert.match(local, /No clinical notes are stored/i);
  assert.doesNotMatch(local, /diagnosis|medication|prescription|symptom|clinical_note|medical_history/i);
});

test("Atlas Local supports multiple doctors with doctor-specific collision protection", () => {
  const shell = source("public/atlas-local.html");
  const logic = source("public/atlas-local.js");
  assert.match(shell, /id="doctor-settings-list"/);
  assert.match(shell, /id="add-doctor"/);
  assert.match(logic, /function activeDoctors/);
  assert.match(logic, /a\.doctorId===doctorId/);
  assert.match(logic, /Keep at least one active doctor/);
});

test("Atlas Local keeps a bounded encrypted local activity trail", () => {
  const logic = source("public/atlas-local.js");
  assert.match(logic, /MAX_HISTORY=3000/);
  assert.match(logic, /function addHistory/);
  assert.match(logic, /state\.history\.push/);
  assert.match(logic, /state\.history=state\.history\.slice\(-MAX_HISTORY\)/);
  assert.match(logic, /statusChanged/);
  assert.match(logic, /doctorAdded/);
});

test("Atlas Local has practical device safety controls", () => {
  const shell = source("public/atlas-local.html");
  const logic = source("public/atlas-local.js");
  assert.match(shell, /id="settings-lock"/);
  assert.match(logic, /scheduleAutoLock/);
  assert.match(logic, /autoLockMinutes/);
  assert.match(logic, /lastActivity/);
  assert.match(logic, /lockClinic/);
});

test("Atlas Local backup stays encrypted and local deletion cannot touch Atlas Online", () => {
  const shell = source("public/atlas-local.html");
  const logic = source("public/atlas-local.js");
  const local = `${shell}\n${logic}`;
  assert.match(logic, /BACKUP_MARKER="atlas-local-backup-v1"/);
  assert.match(logic, /meta:currentMeta,payload/);
  assert.doesNotMatch(logic, /meta:currentMeta,payload,state/);
  assert.match(logic, /indexedDB\.deleteDatabase\(DB_NAME\)/);
  assert.match(local, /does not affect Atlas Online/i);
});

test("Atlas Local supports all four Atlas interface languages", () => {
  const logic = source("public/atlas-local.js");
  assert.match(logic, /en:EN/);
  assert.match(logic, /ku:\{\.\.\.EN/);
  assert.match(logic, /bd:\{\.\.\.EN/);
  assert.match(logic, /ar:\{\.\.\.EN/);
  assert.match(logic, /document\.documentElement\.dir=locale==="en"\?"ltr":"rtl"/);
});

test("Atlas service worker precaches the complete Local app without weakening dashboard continuity", () => {
  const worker = source("public/atlas-sw.js");
  assert.match(worker, /ATLAS_LOCAL_PAGE = "\/atlas-local\.html"/);
  assert.match(worker, /ATLAS_LOCAL_SCRIPT = "\/atlas-local\.js"/);
  assert.match(worker, /ATLAS_LOCAL_MANIFEST = "\/atlas-local\.webmanifest"/);
  assert.match(worker, /cache\.addAll/);
  assert.match(worker, /url\.pathname === ATLAS_LOCAL_PAGE/);
  assert.match(worker, /url\.pathname\.startsWith\("\/dashboard"\)/);
  assert.match(worker, /ATLAS_OFFLINE_PAGE/);
});

test("Atlas Local installs as its own PWA entry instead of opening the online dashboard", () => {
  const manifest = JSON.parse(source("public/atlas-local.webmanifest"));
  assert.equal(manifest.name, "Atlas Local");
  assert.equal(manifest.start_url, "/atlas-local.html");
  assert.equal(manifest.display, "standalone");
});