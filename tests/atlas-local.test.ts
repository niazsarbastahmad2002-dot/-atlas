import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Atlas Local is a separate device-only workspace instead of an online sync mode", () => {
  const shell = source("public/atlas-local.html");
  const logic = source("public/atlas-local.js");
  const local = `${shell}\n${logic}`;

  assert.match(logic, /const DB_NAME = "atlas-local-v1"/);
  assert.match(local, /never syncs automatically/);
  assert.match(local, /never merged into Atlas Online automatically/);
  assert.match(local, /Nothing is sent to Atlas servers/);
  assert.doesNotMatch(local, /supabase|service_role|SUPABASE_SERVICE_ROLE_KEY|\/api\/|graph\.facebook|whatsapp/i);
});

test("Atlas Local encrypts appointment data behind a local PIN", () => {
  const logic = source("public/atlas-local.js");

  assert.match(logic, /PBKDF2/);
  assert.match(logic, /iterations: ITERATIONS/);
  assert.match(logic, /const ITERATIONS = 310000/);
  assert.match(logic, /AES-GCM/);
  assert.match(logic, /crypto\.subtle\.encrypt/);
  assert.match(logic, /crypto\.subtle\.decrypt/);
  assert.match(logic, /\^\\d\{6,12\}\$/);
  assert.match(logic, /MAX_APPOINTMENTS = 5000/);
});

test("Atlas Local remains scheduling-only and avoids clinical data scope", () => {
  const shell = source("public/atlas-local.html");
  const logic = source("public/atlas-local.js");
  const local = `${shell}\n${logic}`;

  assert.match(local, /no clinical notes/i);
  assert.match(local, /scheduling-only/i);
  assert.match(logic, /patientName/);
  assert.match(logic, /phone/);
  assert.doesNotMatch(local, /diagnosis|medication|prescription|symptom|clinical_note|medical_history/i);
});

test("Atlas Local backup stays encrypted and local deletion cannot touch Atlas Online", () => {
  const shell = source("public/atlas-local.html");
  const logic = source("public/atlas-local.js");
  const local = `${shell}\n${logic}`;

  assert.match(logic, /BACKUP_MARKER = "atlas-local-backup-v1"/);
  assert.match(logic, /meta: currentMeta, payload/);
  assert.equal(logic.includes("meta: currentMeta, payload, state"), false);
  assert.match(logic, /indexedDB\.deleteDatabase\(DB_NAME\)/);
  assert.match(local, /does not affect Atlas Online/i);
});

test("Atlas service worker precaches the complete Local app without weakening dashboard continuity", () => {
  const worker = source("public/atlas-sw.js");

  assert.match(worker, /atlas-offline-shell-v3/);
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
