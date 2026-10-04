import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const patientCarePages = [
  "app/care/[clinicSlug]/page.tsx",
  "app/care/[clinicSlug]/[doctorSlug]/page.tsx",
  "app/care/[clinicSlug]/[doctorSlug]/times/page.tsx",
  "app/care/[clinicSlug]/[doctorSlug]/book/page.tsx",
];

test("Patient care unavailable states keep the shared Atlas Patient shell", () => {
  for (const path of patientCarePages) {
    const page = source(path);
    const unavailable = page.slice(page.indexOf("function Unavailable"));
    assert.match(unavailable, /AtlasPatientNav/);
    assert.match(unavailable, /uiLocaleMeta\[locale\]/);
    assert.match(unavailable, /lang=\{meta\.language\}/);
    assert.match(unavailable, /dir=\{meta\.direction\}/);
    assert.doesNotMatch(unavailable, /className="app-brand"/);
  }
});

test("unavailable times and booking return to the doctor when the doctor path is valid", () => {
  for (const path of [
    "app/care/[clinicSlug]/[doctorSlug]/times/page.tsx",
    "app/care/[clinicSlug]/[doctorSlug]/book/page.tsx",
  ]) {
    const page = source(path);
    assert.match(page, /const doctorHref = safeSlug\(clinicSlug\) && safeSlug\(doctorSlug\)/);
    assert.match(page, /\? `\/care\/\$\{clinicSlug\}\/\$\{doctorSlug\}`/);
    assert.match(page, /<Unavailable copy=\{t\} locale=\{locale\} href=\{doctorHref\}/);
  }
});

test("invalid patient route slugs fall back to care instead of echoing them into navigation", () => {
  for (const path of [
    "app/care/[clinicSlug]/[doctorSlug]/times/page.tsx",
    "app/care/[clinicSlug]/[doctorSlug]/book/page.tsx",
  ]) {
    const page = source(path);
    assert.match(page, /: "\/care";/);
  }
});
