import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("patient appointment language can be changed without changing stored reminder language", () => {
  const page = source("app/patient/[token]/page.tsx");
  const actions = source("app/patient/[token]/actions.ts");

  assert.match(page, /isPatientLocale\(query\.lang\)[\s\S]*?query\.lang[\s\S]*?patientLocale\(appointment\.reminder_language\)/);
  assert.match(page, /patientLanguageOptions/);
  assert.match(page, /سۆرانی/);
  assert.match(page, /بادینی/);
  assert.match(page, /العربية/);
  assert.match(page, /English/);
  assert.match(page, /aria-current=\{locale === option\.locale \? "page" : undefined\}/);
  assert.match(page, /name="return_lang" value=\{locale\}/);

  assert.match(actions, /params\.set\("lang", returnLanguage\)/);
  assert.doesNotMatch(actions, /reminder_language\s*:/);
  assert.doesNotMatch(actions, /update\([^)]*reminder_language/);
});

test("patient language links preserve reminder-response context", () => {
  const page = source("app/patient/[token]/page.tsx");

  assert.match(page, /function patientLanguageHref\([\s\S]*token: string,[\s\S]*locale: PatientLocale,[\s\S]*reminderView: boolean,[\s\S]*accountMarker: string,[\s\S]*\)/);
  assert.match(page, /if \(reminderView\) params\.set\("view", "reminder"\)/);
  assert.match(page, /if \(accountMarker\) params\.set\("account", accountMarker\)/);
  assert.match(page, /href=\{patientLanguageHref\(token, option\.locale, reminderView, accountMarker\)\}/);
});
