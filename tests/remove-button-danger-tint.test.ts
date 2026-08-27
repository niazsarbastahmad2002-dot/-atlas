import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/appointment-actions.tsx", import.meta.url), "utf8");

test("Atlas Online remove action is visibly destructive without becoming visually loud", () => {
  assert.match(source, /\.appointment-remove-action \{[\s\S]*background: #fde8e8;/);
  assert.match(source, /border: 1px solid #dfa9a9;/);
  assert.match(source, /color: var\(--danger\);/);
  assert.match(source, /\.appointment-remove-action:hover \{ background: #fbd8d8; border-color: #d89595; \}/);
});
