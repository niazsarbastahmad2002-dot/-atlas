import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/dashboard/clinical-preview/page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/dashboard/clinical-preview/clinical-preview.css", import.meta.url), "utf8");

test("clinical preview is gated to authenticated clinic administrators", () => {
  assert.match(page, /supabase\.auth\.getUser\(\)/);
  assert.match(page, /if \(authError \|\| !auth\.user\) redirect\("\/login"\)/);
  assert.match(page, /params\.clinic && \(!requested \|\| !clinics\.some/);
  assert.match(page, /\.from\("clinic_members"\)\.select\("role"\)\.eq\("clinic_id", clinic\.id\)/);
  assert.match(page, /const canReview = clinic\.owner_id === auth\.user\.id \|\| membership\?\.role === "owner" \|\| membership\?\.role === "manager"/);
  assert.match(page, /if \(!canReview\) redirect\("\/dashboard"\)/);
});

test("clinical preview cannot accidentally create real clinical data", () => {
  assert.doesNotMatch(page, /\.from\("(appointments|patient_profiles|clinical_|visits|encounters)/);
  assert.doesNotMatch(page, /\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
  assert.doesNotMatch(page, /<form\b|<input\b|<textarea\b|contentEditable|localStorage|sessionStorage/);
  assert.doesNotMatch(page, /<button\b|window\.print|print\(\)/);
  assert.match(page, /no patient records or notes are loaded or saved/);
  assert.match(page, /not clinical authorization/);
});

test("clinical preview separates clinician workflow and four UI languages", () => {
  for (const locale of ["en", "ku", "bd", "ar"]) assert.match(page, new RegExp("^  " + locale + ": \\{", "m"));
  for (const key of ["complaint", "history", "exam", "assessment", "plan"]) assert.match(page, new RegExp('"' + key + '"'));
  assert.match(page, /dir=\{locale === "en" \? "ltr" : "rtl"\}/);
  assert.match(page, /t\.noPatient/);
  assert.match(page, /t\.restricted/);
  assert.match(page, /t\.review/);
});

test("clinical preview has desktop, tablet and phone compositions", () => {
  assert.match(styles, /grid-template-columns:minmax\(205px,245px\) minmax\(0,1fr\) minmax\(235px,285px\)/);
  assert.match(styles, /@media\(max-width:1130px\)/);
  assert.match(styles, /@media\(max-width:750px\)/);
  assert.match(styles, /@media\(max-width:460px\)/);
  assert.match(styles, /\.clinical-preview-locked/);
  assert.match(styles, /\.clinical-preview-confidential/);
});
