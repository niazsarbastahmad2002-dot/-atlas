import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/appointment-actions.tsx", import.meta.url), "utf8");
const policy = readFileSync(new URL("../app/atlas-action-consistency.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("../app/dashboard/layout.tsx", import.meta.url), "utf8");

test("appointment Remove stays neutral in light and dark while confirmation remains the destructive safety gate", () => {
  assert.match(source, /className="appointment-remove-action"/);
  assert.match(source, /window\.confirm\(workflow\.removeQuestion\)/);
  assert.match(policy, /\.row-actions button\.appointment-remove-action \{/);
  assert.match(policy, /background: var\(--surface-soft\) !important;/);
  assert.match(policy, /color: var\(--ink-soft\) !important;/);
  assert.match(policy, /border: 1px solid var\(--line-strong\) !important;/);
  assert.doesNotMatch(policy, /#ffe1e1|#a61b1b|#d76d6d/);
  assert.match(layout, /import "\.\.\/atlas-action-consistency\.css";/);
});
