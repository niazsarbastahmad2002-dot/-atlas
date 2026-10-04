import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const pages = [
  "app/care/page.tsx",
  "app/care/[clinicSlug]/page.tsx",
  "app/care/[clinicSlug]/[doctorSlug]/page.tsx",
  "app/care/[clinicSlug]/[doctorSlug]/times/page.tsx",
  "app/care/[clinicSlug]/[doctorSlug]/book/page.tsx",
];

test("Atlas Patient public care pages declare the active language and direction", () => {
  for (const path of pages) {
    const page = source(path);
    assert.match(page, /uiLocaleMeta\[locale\]/);
    assert.match(page, /<main[^>]*lang=\{meta\.language\}[^>]*dir=\{meta\.direction\}/);
  }
});

test("RTL page direction keeps phone and time values direction-safe", () => {
  const clinic = source("app/care/[clinicSlug]/page.tsx");
  const doctor = source("app/care/[clinicSlug]/[doctorSlug]/page.tsx");
  const times = source("app/care/[clinicSlug]/[doctorSlug]/times/page.tsx");

  assert.match(clinic, /dir="ltr">\{phone\}/);
  assert.match(doctor, /dir="ltr">\{phone\}/);
  assert.match(doctor, /dir="auto">\{time\.label\}/);
  assert.match(times, /dir="auto">\{slot\.label\}/);
});
