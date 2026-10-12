import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { nameMatchScore, normalizePhone, normalizeName } from "../lib/mobile-appointment-search.ts";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("desktop and large iPad schedules expose the existing appointment finder, not phone disclosure rows", () => {
  const css = source("app/atlas-workspace-finder.css");
  const layout = source("app/layout.tsx");
  const mobile = source("app/dashboard/mobile-appointment-experience.tsx");
  const dashboard = source("app/dashboard/page.tsx");

  assert.match(layout, /import "\.\/atlas-workspace-finder\.css"/);
  assert.ok(layout.indexOf('import "./atlas-workspace-finder.css"') > layout.indexOf('import "./atlas-final-readability.css"'));
  assert.match(css, /@media \(min-width: 901px\)/);
  assert.match(css, /\.appointments-panel \.atlas-phone-appointment-search \{[\s\S]*display: grid !important/);
  assert.match(css, /\.appointments-panel \.appointment-row\.is-atlas-phone-search-hidden \{[\s\S]*display: none !important/);
  assert.match(css, /\.appointments-panel \.atlas-phone-appointment-summary \{\s*display: none !important/);
  assert.match(css, /html\[dir="rtl"\]/);
  assert.match(mobile, /const input = document\.createElement\("input"\)/);
  assert.match(mobile, /input\.type = "search"/);
  assert.match(mobile, /const activeList = currentList\(\)/);
  assert.match(mobile, /applyFilter\(activeList\)/);
  assert.match(mobile, /setText\(countNode, `\$\{localizeDigits\(visible, locale\)\}/);
  assert.match(dashboard, /href="#atlas-appointment-search" data-atlas-find-patient="true"/);
});

test("the shared finder handles Kurdish/Arabic names and mixed Iraqi phone digits", () => {
  assert.equal(normalizeName("ياسین"), normalizeName("یاسین"));
  assert.equal(nameMatchScore("Sara Ahmed", "Sara"), 2);
  assert.equal(normalizePhone("0750 ١٢٣ ۴۵۶۷"), "07501234567");
});
