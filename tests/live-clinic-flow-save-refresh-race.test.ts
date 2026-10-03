import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/live-clinic-flow.tsx", import.meta.url), "utf8");

test("live clinic refresh cannot overwrite an in-flight timing save", () => {
  assert.match(source, /const savingRef = useRef\(false\)/);
  assert.match(source, /if \(savingRef\.current\) return/);
  assert.match(source, /savingRef\.current = true;\s*\+\+loadRequestRef\.current/);
  assert.match(source, /finally \{\s*savingRef\.current = false;\s*setSaving\(null\)/);
});
