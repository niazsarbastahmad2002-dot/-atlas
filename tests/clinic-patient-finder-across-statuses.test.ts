import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Find patient reaches all statuses before searching today's appointments", () => {
  const page = source("app/dashboard/page.tsx");
  assert.match(page, /visibleRows\.length > 0 \? <a className="clinic-command-secondary"/);
  assert.match(page, /focus === "all" \? "#atlas-appointment-search" : `\$\{scheduleHref\(clinic\.id, selectedDay, selectedDoctorId\)\}#atlas-appointment-search`/);
  assert.match(page, /data-atlas-find-patient="true"/);
});

test("Finder respects full-schedule navigation before focusing the new result list", () => {
  const client = source("app/dashboard/mobile-appointment-experience.tsx");
  assert.match(client, /if \(destination\.pathname !== window\.location\.pathname \|\| destination\.search !== window\.location\.search\) return;/);
  assert.match(client, /const focusFinderHashTarget = \(\) => \{/);
  assert.match(client, /if \(window\.location\.hash !== "#atlas-appointment-search"\)/);
  assert.match(client, /lastFocusedFinderRoute === route/);
  assert.match(client, /if \(!input\) return;/);
  assert.match(client, /focusFinderHashTarget\(\)/);
  assert.match(client, /input\.focus\(\{ preventScroll: true \}\)/);
  assert.match(client, /resetSearchForScheduleChange\(\)/);
  assert.match(client, /window\.addEventListener\("hashchange", schedulePrepare\)/);
});
