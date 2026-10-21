import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const welcome = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const care = readFileSync(new URL("../app/care/page.tsx", import.meta.url), "utf8");
const resolver = readFileSync(new URL("../app/care/patient-locale.ts", import.meta.url), "utf8");

test("Welcome respects explicit patient language before cookie fallback", () => {
  assert.match(welcome, /resolvePatientLocale\(\(await searchParams\)\.lang\)/);
  assert.match(resolver, /typeof value === "string" && isUiLocale\(value\)/);
  assert.match(resolver, /return getUiLocale\(\)/);
  for (const locale of ["en", "ku", "bd", "ar"]) {
    assert.match(welcome, new RegExp("\\b" + locale + ": \\{"));
  }
  assert.match(care, /dir=\{locale === "en" \? "ltr" : "rtl"\}/);
});

test("Patient Welcome and Find Care preserve locale without changing Doctor entry", () => {
  assert.ok(welcome.includes('href={patientLocaleHref("/care", locale)}'));
  assert.ok(welcome.includes('href={patientLocaleHref("/patient-account", locale)}'));
  assert.ok(care.includes('className="atlas-care-back" href={patientLocaleHref("/", locale)}'));
  assert.ok(welcome.includes('href="/dashboard"'));
});
