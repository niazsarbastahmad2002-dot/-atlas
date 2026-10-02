import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/scroll-continuity.tsx", import.meta.url), "utf8");

test("dashboard scroll continuity cannot fail the receptionist workflow when session storage is blocked", () => {
  assert.match(source, /function readSavedScroll\(\)/);
  assert.match(source, /function writeSavedScroll\(saved: SavedScroll\)/);
  assert.match(source, /function clearSavedScroll\(\)/);
  assert.match(source, /writeSavedScroll\(\{/);
  assert.match(source, /const raw = readSavedScroll\(\)/);
  assert.match(source, /clearSavedScroll\(\)/);
  assert.doesNotMatch(source, /window\.sessionStorage\.setItem\(storageKey[\s\S]*rememberScroll/);
});
