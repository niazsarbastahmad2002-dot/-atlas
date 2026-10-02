import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/dashboard-client-polish.tsx", import.meta.url), "utf8");

test("dashboard polish observer stays scoped to the Atlas shell", () => {
  assert.match(source, /const observerRoot = document\.querySelector\("\.app-shell"\) \?\? document\.body/);
  assert.match(source, /observer\.observe\(observerRoot, \{ childList: true, subtree: true, characterData: true \}\)/);
  assert.doesNotMatch(source, /observer\.observe\(document\.body/);
});
