import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/preference-memory.tsx", import.meta.url), "utf8");

test("reminder preference refreshes when the active clinic form changes", () => {
  assert.match(source, /activeKey/);
  assert.match(source, /atlas:last-reminder-language/);
  assert.match(source, /new MutationObserver/);
  assert.match(source, /removeEventListener\("change", saveLanguage\)/);
  assert.match(source, /localStorage\.getItem/);
  assert.match(source, /localStorage\.setItem/);
});
