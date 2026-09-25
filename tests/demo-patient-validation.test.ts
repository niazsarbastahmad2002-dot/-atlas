import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("public demo uses the same basic patient input validation as Atlas", () => {
  const demo = readFileSync(new URL("../app/demo/demo-modern.tsx", import.meta.url), "utf8");
  assert.match(demo, /cleanDisplayName/);
  assert.match(demo, /isValidDisplayName/);
  assert.match(demo, /normalizeIraqiMobile/);
  assert.match(demo, /formatIraqiMobile/);
  assert.match(demo, /Enter a valid Iraqi mobile number/);
});
