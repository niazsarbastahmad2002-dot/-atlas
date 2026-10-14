import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const page = read("app/dashboard/history/page.tsx");
const client = read("app/dashboard/history/history-client.tsx");
const styles = read("app/dashboard/history/history-enhancements.module.css");

test("history status filter separates removed from every other status", () => {
  for (const status of ["all", "active", "completed", "cancelled", "no_show", "removed"]) {
    assert.match(client, new RegExp(`<option value="${status}">`));
  }
  assert.match(client, /filter === "removed"\s*\? row\.removed/);
  assert.match(client, /: !row\.removed &&/);
  assert.match(client, /row\.status === filter/);
  assert.match(client, /row\.removed \? styles\.removed/);
  assert.doesNotMatch(client, /row\.removed \? "cancelled" : row\.status/);
});

test("history day search uses Baghdad-local appointment calendar date", () => {
  assert.match(page, /appointmentDay: new Intl\.DateTimeFormat\("sv-SE"/);
  assert.match(page, /timeZone: "Asia\/Baghdad"/);
  assert.match(client, /row\.appointmentDay === day/);
  assert.match(client, /type="date" aria-label=\{t\.date\}/);
  assert.match(client, /localizeDigits\(visibleRows\.length, locale\)/);
  assert.match(client, /localizeDigits\(rows\.length, locale\)/);
});

test("history limits deletion selection to existing server batch maximum and preserves clinic isolation", () => {
  assert.match(client, /const DELETE_BATCH_LIMIT = 250/);
  assert.match(client, /removableVisible\.slice\(0, DELETE_BATCH_LIMIT\)/);
  assert.match(client, /selected\.size >= DELETE_BATCH_LIMIT/);
  assert.match(client, /selectedVisible\.length === 0/);
  assert.match(client, /deleteArchivedAppointments\(clinicId, ids\)/);
  assert.match(page, /<HistoryClient key=\{clinic\.id\} clinicId=\{clinic\.id\}/);
  assert.match(page, /\.eq\("clinic_id", clinic\.id\)/);
});

test("history visual enhancements remain scoped and protect mixed-script content", () => {
  assert.match(client, /history-enhancements\.module\.css/);
  assert.match(client, /dir="auto" data-atlas-user-content="true"/);
  assert.match(client, /dir="ltr">\{row\.patientPhone\}/);
  assert.match(styles, /@media \(max-width: 720px\)/);
  assert.match(styles, /\.removed\s*\{/);
  assert.match(styles, /:global\(:root\[data-theme="dark"\]\) \.badge\.missed/);
  assert.match(styles, /:global\(:root\[data-theme="dark"\]\) \.badge\.removed/);
});
