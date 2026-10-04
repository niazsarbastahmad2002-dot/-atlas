import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/select-clinic/page.tsx", import.meta.url), "utf8");

test("clinic chooser action arrow follows the active writing direction", () => {
  assert.match(source, /const openArrow = locale === "en" \? "→" : "←"/);
  assert.match(source, /<span aria-hidden="true">\{openArrow\}<\/span>/);
});
