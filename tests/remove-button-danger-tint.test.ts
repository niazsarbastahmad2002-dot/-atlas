import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/appointment-actions.tsx", import.meta.url), "utf8");

test("Atlas Online remove action is visibly destructive without becoming visually loud", () => {
  assert.match(source, /\.appointment-remove-action \{[\s\S]*background: #fff4f4;/);
  assert.match(source, /border: 1px solid #e7bcbc;/);
  assert.match(source, /color: var\(--danger\);/);
  assert.match(source, /\.appointment-remove-action:hover \{ background: #ffe8e8; border-color: #dda7a7; \}/);
});
