import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/scroll-continuity.tsx", import.meta.url), "utf8");

test("dashboard scroll continuity cannot fail the receptionist workflow when session storage is blocked", () => {
  assert.match(source, /function readSavedScroll\(\)/);
  assert.match(source, /function writeSavedScroll\(saved: SavedScroll\)/);
  assert.match(source, /function clearSavedScroll\(\)/);
  assert.match(source, /const raw = readSavedScroll\(\)/);
  assert.match(source, /clearSavedScroll\(\)/);

  const rememberScroll = source.match(/function rememberScroll\(event: SubmitEvent\) \{[\s\S]*?\n    \}/)?.[0] ?? "";
  assert.match(rememberScroll, /writeSavedScroll\(\{/);
  assert.doesNotMatch(rememberScroll, /sessionStorage\./);
});
