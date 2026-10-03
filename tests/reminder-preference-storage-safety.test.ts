import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("reminder preference memory does not depend on browser storage availability", () => {
  const memory = read("app/dashboard/preference-memory.tsx");

  assert.match(memory, /function readPreference\(key: string\)[\s\S]*try \{[\s\S]*window\.localStorage\.getItem\(key\)[\s\S]*catch \{[\s\S]*return null/);
  assert.match(memory, /function writePreference\(key: string, value: string\)[\s\S]*try \{[\s\S]*window\.localStorage\.setItem\(key, value\)[\s\S]*catch \{/);
  assert.match(memory, /const savedLanguage = readPreference\(languageKey\)/);
  assert.match(memory, /writePreference\(`atlas:last-reminder-language:\$\{clinicId\}`, languageSelect\.value\)/);
});

test("doctor workflow language fallback survives blocked preference storage", () => {
  const timeField = read("app/dashboard/appointment-time-field-v2.tsx");

  assert.match(timeField, /let savedLanguage: string \| null = null/);
  assert.match(timeField, /try \{[\s\S]*window\.localStorage\.getItem\(`atlas:last-reminder-language:\$\{clinic\.value\}`\)[\s\S]*catch \{/);
  assert.match(timeField, /const preferredLanguage = savedLanguage/);
});
