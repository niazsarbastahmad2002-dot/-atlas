import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/appointment-actions.tsx", import.meta.url), "utf8");

test("Atlas Online remove action is clearly destructive without becoming visually loud", () => {
  assert.match(source, /\.appointment-remove-action \{[\s\S]*background: #ffe1e1;/);
  assert.match(source, /border: 1px solid #d76d6d;/);
  assert.match(source, /color: #a61b1b;/);
  assert.match(source, /font-weight: 820;/);
  assert.match(source, /\.appointment-remove-action:hover \{ background: #ffd0d0; border-color: #c95353; color: #8f1515; \}/);
});
