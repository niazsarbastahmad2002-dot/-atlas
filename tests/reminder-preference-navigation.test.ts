import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("reminder language memory follows the currently rendered clinic form", () => {
  const memory = source("app/dashboard/preference-memory.tsx");
  const timeField = source("app/dashboard/appointment-time-field-v2.tsx");

  assert.match(memory, /function clinicIdFor/);
  assert.match(memory, /select\.form\?\.querySelector/);
  assert.match(memory, /document\.addEventListener\("change", saveLanguage\)/);
  assert.match(memory, /new MutationObserver\(prepare\)/);
  assert.match(memory, /attributeFilter: \["value"\]/);
  assert.match(memory, /atlas:last-reminder-language:\$\{clinicId\}/);
  assert.doesNotMatch(memory, /languageSelect\.addEventListener\("change"/);

  assert.match(timeField, /atlas:last-reminder-language:\$\{clinic\.value\}/);
  assert.match(timeField, /const preferredLanguage = savedLanguage/);
  assert.match(timeField, /languageSelect\.value = preferredLanguage/);
});
