import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/select-clinic/page.tsx", import.meta.url), "utf8");

test("clinic selection retains authenticated RLS reads and existing fast paths", () => {
  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.match(source, /if \(userError \|\| !userData\.user\) redirect\("\/login"\)/);
  assert.match(source, /\.from\("clinics"\)[\s\S]*?\.select\("id, name"\)/);
  assert.match(source, /if \(!clinics\?\.length\) redirect\("\/dashboard"\)/);
  assert.match(source, /if \(clinics\.length === 1\) redirect\("\/dashboard\?clinic=" \+ encodeURIComponent\(clinics\[0\]\.id\)\)/);
  assert.match(source, /href=\{"\/dashboard\?clinic=" \+ encodeURIComponent\(clinic\.id\)\}/);
  assert.doesNotMatch(source, /from\("clinic_members"\)|createAdminClient|\.insert\(|\.upsert\(|\.update\(|\.delete\(/);
});

test("selection has safe, localized loading and retryable error states", () => {
  for (const locale of ["en", "ku", "bd", "ar"]) {
    assert.match(source, new RegExp("  " + locale + ": \\{"));
  }
  assert.match(source, /<Suspense fallback=\{<ClinicSelectionLoading locale=\{locale\} \/>\}>/);
  assert.match(source, /role="status" aria-live="polite" aria-busy="true"/);
  assert.match(source, /if \(clinicsError\)/);
  assert.match(source, /role="alert"/);
  assert.match(source, /href="\/dashboard\/select-clinic" prefetch=\{false\}/);
  assert.doesNotMatch(source, /if \(clinicsError\) redirect/);
});

test("choices are accessible, script-safe and responsive with no unwanted clinic prefetch", () => {
  assert.match(source, /dir=\{locale === "en" \? "ltr" : "rtl"\}/);
  assert.match(source, /className="clinic-choice-name" data-atlas-user-content="true" dir="auto"/);
  assert.match(source, /<ul className="clinic-choice-list" aria-label=\{t\.list\}>/);
  assert.match(source, /href=\{"\/dashboard\?clinic=" \+ encodeURIComponent\(clinic\.id\)\} prefetch=\{false\}/);
  assert.match(source, /:focus-visible/);
  assert.match(source, /@media\(max-width:720px\)/);
  assert.match(source, /@media\(max-width:420px\)/);
  assert.match(source, /prefers-reduced-motion:reduce/);
});
