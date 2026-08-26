import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Atlas Local is a separate device-only workspace instead of an online sync mode", () => {
  const local = source("public/atlas-local.html");

  assert.match(local, /const DB_NAME = "atlas-local-v1"/);
  assert.match(local, /never syncs automatically/);
  assert.match(local, /never merged into Atlas Online automatically/);
  assert.match(local, /Nothing is sent to Atlas servers/);
  assert.doesNotMatch(local, /supabase|service_role|SUPABASE_SERVICE_ROLE_KEY|\/api\/|graph\.facebook|whatsapp/i);
});

test("Atlas Local encrypts appointment data behind a local PIN", () => {
  const local = source("public/atlas-local.html");

  assert.match(local, /PBKDF2/);
  assert.match(local, /iterations:ITERATIONS/);
  assert.match(local, /const ITERATIONS = 310000/);
  assert.match(local, /AES-GCM/);
  assert.match(local, /crypto\.subtle\.encrypt/);
  assert.match(local, /crypto\.subtle\.decrypt/);
  assert.match(local, /\^\\d\{6,12\}\$/);
  assert.match(local, /MAX_APPOINTMENTS = 5000/);
});

test("Atlas Local remains scheduling-only and avoids clinical data scope", () => {
  const local = source("public/atlas-local.html");

  assert.match(local, /no clinical notes/i);
  assert.match(local, /scheduling-only/i);
  assert.match(local, /patientName/);
  assert.match(local, /phone/);
  assert.doesNotMatch(local, /diagnosis|medication|prescription|symptom|clinical_note|medical_history/i);
});

test("Atlas Local backup stays encrypted and local deletion cannot touch Atlas Online", () => {
  const local = source("public/atlas-local.html");

  assert.match(local, /BACKUP_MARKER = "atlas-local-backup-v1"/);
  assert.match(local, /meta:currentMeta, payload/);
  assert.equal(local.includes("meta:currentMeta, payload, state"), false);
  assert.match(local, /indexedDB\.deleteDatabase\(DB_NAME\)/);
  assert.match(local, /does not affect Atlas Online/i);
});

test("Atlas service worker precaches Atlas Local without weakening dashboard continuity", () => {
  const worker = source("public/atlas-sw.js");

  assert.match(worker, /atlas-offline-shell-v2/);
  assert.match(worker, /ATLAS_LOCAL_PAGE = "\/atlas-local\.html"/);
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
