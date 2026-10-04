import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/patient-link-button.tsx", import.meta.url), "utf8");

test("manual patient sharing exposes a selectable link when clipboard copy fails", () => {
  assert.match(source, /ref=\{copyFallbackRef\}/);
  assert.match(source, /className="patient-link-copy-fallback"/);
  assert.match(source, /value=\{initialLink \?\? ""\}/);
  assert.match(source, /readOnly/);
  assert.match(source, /onFocus=\{\(event\) => event\.currentTarget\.select\(\)\}/);
  assert.match(source, /copyFallbackRef\.current\?\.focus\(\)/);
  assert.match(source, /copyFallbackRef\.current\?\.select\(\)/);
  assert.match(source, /function closeShareResult\(\)/);
  assert.match(source, /onClick=\{closeShareResult\}/);
});
