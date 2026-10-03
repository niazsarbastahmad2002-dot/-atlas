import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("dashboard live refresh preserves active receptionist appointment drafts", () => {
  const refresh = read("app/components/live-page-refresh.tsx");
  const busy = read("app/dashboard/schedule-form-busy.ts");
  const timeField = read("app/dashboard/appointment-time-field-v2.tsx");

  assert.match(refresh, /scheduleFormIsBusy/);
  assert.match(busy, /form\.appointment-edit-form/);
  assert.match(busy, /select\[name="contact_relationship"\]/);
  assert.match(busy, /input\[name="reminder_consent"\]/);
  assert.match(busy, /data-atlas-time-draft="true"/);
  assert.match(busy, /active instanceof HTMLElement && form\.contains\(active\)/);
  assert.match(timeField, /data-atlas-time-draft=\{dateOpen \|\| touched \|\| date !== savedDate \? "true" : "false"\}/);
});

test("Safari stall recovery follows later schedule loading states safely", () => {
  const refresh = read("app/components/live-page-refresh.tsx");

  assert.match(refresh, /function reserveSafariStallReload\(now: number\)/);
  assert.match(refresh, /window\.sessionStorage\.getItem\(key\)/);
  assert.match(refresh, /window\.sessionStorage\.setItem\(key, String\(now\)\)/);
  assert.match(refresh, /catch \{[\s\S]*return false;/);
  assert.match(refresh, /const loadingSelector = 'main\[aria-busy="true"\]\[data-atlas-loading="schedule"\]'/);
  assert.match(refresh, /new MutationObserver\(sync\)/);
  assert.match(refresh, /observer\.observe\(document\.querySelector\("\.app-shell"\) \?\? document\.body/);
  assert.match(refresh, /timer = window\.setTimeout\(\(\) => \{/);
  assert.match(refresh, /!reserveSafariStallReload\(Date\.now\(\)\)/);
  assert.match(refresh, /window\.clearTimeout\(timer\)/);
  assert.match(refresh, /observer\.disconnect\(\)/);
});


test("successful inline appointment saves clear the time draft marker", () => {
  const timeField = read("app/dashboard/appointment-time-field-v2.tsx");
  const polish = read("app/dashboard/dashboard-client-polish.tsx");

  assert.match(polish, /document\.dispatchEvent\(new Event\("atlas:appointment-saved"\)\)/);
  assert.match(timeField, /document\.addEventListener\("atlas:appointment-saved", clearSavedDraft\)/);
  assert.match(timeField, /const \[savedDate, setSavedDate\] = useState\(initial\)/);
  assert.match(timeField, /const clearSavedDraft = \(\) => \{[\s\S]*setDateOpen\(false\);[\s\S]*setTouched\(false\);[\s\S]*setSavedDate\(dateRef\.current\);/);
  assert.match(timeField, /setSavedDate\(\(current\) => current === date \? minDate : current\)/);
  assert.match(timeField, /document\.removeEventListener\("atlas:appointment-saved", clearSavedDraft\)/);
});


test("dashboard live refresh waits for active receptionist writes", () => {
  const busy = read("app/dashboard/schedule-form-busy.ts");
  const liveFlow = read("app/dashboard/live-clinic-flow.tsx");
  const patientLink = read("app/dashboard/patient-link-button.tsx");

  assert.match(busy, /appointment-action-bar\[aria-busy="true"\]/);
  assert.match(busy, /live-clinic-flow\[aria-busy="true"\]/);
  assert.match(busy, /patient-link-control form\[aria-busy="true"\]/);
  assert.match(busy, /form\.dataset\.fastSaving === "true"/);
  assert.match(liveFlow, /aria-busy=\{saving !== null\}/);
  assert.match(patientLink, /<form action=\{action\} aria-busy=\{pending\}>/);
});


test("live refresh timers pause while Atlas is hidden and resync on return", () => {
  const refresh = read("app/components/live-page-refresh.tsx");

  assert.match(refresh, /if \(pathname\.startsWith\("\/patient\/"\)\)[\s\S]*document\.visibilityState !== "visible"[\s\S]*window\.clearInterval\(timer\)/);
  assert.match(refresh, /timer = window\.setInterval\(\(\) => router\.refresh\(\), 15_000\)/);
  assert.match(refresh, /if \(pathname !== "\/dashboard"\) return;[\s\S]*document\.visibilityState !== "visible"[\s\S]*timer = window\.setInterval\(refresh, 12_000\)/);
  assert.ok((refresh.match(/document\.addEventListener\("visibilitychange", onVisibilityChange\)/g) ?? []).length >= 2);
  assert.ok((refresh.match(/document\.removeEventListener\("visibilitychange", onVisibilityChange\)/g) ?? []).length >= 2);
});
