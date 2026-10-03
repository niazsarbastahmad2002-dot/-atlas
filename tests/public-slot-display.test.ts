import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("public doctor profiles show only bounded live slot data", () => {
  const page = source("app/care/[clinicSlug]/[doctorSlug]/page.tsx");

  assert.match(page, /list_public_doctor_slots/);
  assert.match(page, /p_days: 7/);
  assert.match(page, /if \(group\.times\.length < 4\)/);
  assert.match(page, /Asia\/Baghdad/);
  assert.doesNotMatch(page, /\.from\("appointments"\)|patient_name|patient_phone|reminder_status/);
});

test("public availability is useful without pretending self-booking is active", () => {
  const page = source("app/care/[clinicSlug]/[doctorSlug]/page.tsx");

  assert.match(page, /online self-booking is not enabled yet/);
  assert.match(page, /href=\{\`tel:\$\{profile\.public_phone\}\`\}/);
  assert.doesNotMatch(page, />Book now</i);
});

test("public slot cards use theme-aware surfaces", () => {
  const page = source("app/care/[clinicSlug]/[doctorSlug]/page.tsx");

  assert.doesNotMatch(page, /background:#fff/);
  assert.match(page, /background:var\(--surface\)/);
  assert.match(page, /background:var\(--surface-soft\)/);
});
