import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("dashboard live refresh preserves active receptionist appointment drafts", () => {
  const refresh = read("app/components/live-page-refresh.tsx");
  const timeField = read("app/dashboard/appointment-time-field-v2.tsx");

  assert.match(refresh, /select\[name="contact_relationship"\]/);
  assert.match(refresh, /input\[name="reminder_consent"\]/);
  assert.match(refresh, /data-atlas-time-draft="true"/);
  assert.match(refresh, /active instanceof HTMLElement && form\.contains\(active\)/);
  assert.match(timeField, /data-atlas-time-draft=\{dateOpen \|\| touched \|\| date !== initial \? "true" : "false"\}/);
});

test("Safari stall recovery only reloads when its throttle can be stored safely", () => {
  const refresh = read("app/components/live-page-refresh.tsx");

  assert.match(refresh, /function reserveSafariStallReload\(now: number\)/);
  assert.match(refresh, /window\.sessionStorage\.getItem\(key\)/);
  assert.match(refresh, /window\.sessionStorage\.setItem\(key, String\(now\)\)/);
  assert.match(refresh, /catch \{[\s\S]*return false;/);
  assert.match(refresh, /if \(!reserveSafariStallReload\(Date\.now\(\)\)\) return;/);
});


test("successful inline appointment saves clear the time draft marker", () => {
  const timeField = read("app/dashboard/appointment-time-field-v2.tsx");
  const polish = read("app/dashboard/dashboard-client-polish.tsx");

  assert.match(polish, /document\.dispatchEvent\(new Event\("atlas:appointment-saved"\)\)/);
  assert.match(timeField, /document\.addEventListener\("atlas:appointment-saved", clearSavedDraft\)/);
  assert.match(timeField, /const clearSavedDraft = \(\) => \{[\s\S]*setDateOpen\(false\);[\s\S]*setTouched\(false\);/);
  assert.match(timeField, /document\.removeEventListener\("atlas:appointment-saved", clearSavedDraft\)/);
});
