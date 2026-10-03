import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/dashboard-client-polish.tsx", import.meta.url), "utf8");

test("dashboard polish observer stays scoped to the Atlas shell", () => {
  assert.match(source, /const observerRoot = document\.querySelector\("\.app-shell"\) \?\? document\.body/);
  assert.match(source, /observer\.observe\(observerRoot, \{ childList: true, subtree: true, characterData: true \}\)/);
  assert.doesNotMatch(source, /observer\.observe\(document\.body/);
});


test("dashboard polish removes locale-bound DOM listeners before rebuilding", () => {
  assert.match(source, /const listenerCleanups: Array<\(\) => void> = \[\]/);
  assert.match(source, /input\.removeEventListener\("input", update\)/);
  assert.match(source, /form\.removeEventListener\("submit", handleSubmit, true\)/);
  assert.match(source, /listenerCleanups\.forEach\(\(cleanup\) => cleanup\(\)\)/);
});
