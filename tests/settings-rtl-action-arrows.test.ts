import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/settings/page.tsx", import.meta.url), "utf8");

test("Settings forward-action arrows follow the active writing direction", () => {
  assert.match(source, /const actionArrow = locale === "en" \? "→" : "←"/);
  assert.ok((source.match(/<span aria-hidden="true">\{actionArrow\}<\/span>/g) ?? []).length >= 5);
  assert.doesNotMatch(source, /<span aria-hidden="true">→<\/span>/);
});
