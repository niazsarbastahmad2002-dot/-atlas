import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8");

test("schedule card labels its appointment count instead of showing a tiny unlabeled number", () => {
  assert.match(source, /className="schedule-count-box"/);
  assert.match(source, /<span>\{days\.appointments\}<\/span><strong>\{visibleRows\.length\}<\/strong>/);
  assert.match(source, /aria-label=\{`\$\{days\.appointments\}: \$\{visibleRows\.length\}`\}/);
  assert.doesNotMatch(source, /className="count-pill">\{visibleRows\.length\}/);
});

test("appointment count box is deliberately prominent and responsive", () => {
  assert.match(source, /\.schedule-count-box\{[\s\S]*min-width:122px;[\s\S]*min-height:68px;/);
  assert.match(source, /\.schedule-count-box strong\{font-size:29px;/);
  assert.match(source, /@media\(max-width:520px\)[\s\S]*\.schedule-count-box\{min-width:104px;min-height:62px;/);
});
