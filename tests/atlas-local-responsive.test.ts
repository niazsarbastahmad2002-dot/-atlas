import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Atlas Local responsive fixes keep date and appointment controls from colliding", () => {
  const responsive = source("public/atlas-local-responsive.js");
  assert.match(responsive, /grid-template-columns: max-content minmax\(0, 1fr\) max-content max-content/);
  assert.match(responsive, /\.day-input[\s\S]*min-width: 0/);
  assert.match(responsive, /\.composer-grid[\s\S]*minmax\(170px, max-content\)/);
  assert.match(responsive, /\.composer-grid \.button[\s\S]*width: 100%/);
});

test("Atlas Local responsive fixes adapt for phones and tablets", () => {
  const responsive = source("public/atlas-local-responsive.js");
  assert.match(responsive, /@media \(max-width: 900px\)/);
  assert.match(responsive, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(responsive, /@media \(max-width: 640px\)/);
  assert.match(responsive, /grid-template-columns: minmax\(0, 1fr\)/);
});

test("Atlas Local loader and offline cache include the responsive fixes", () => {
  const loader = source("public/atlas-local.js");
  const worker = source("public/atlas-sw.js");
  assert.match(loader, /"\/atlas-local-responsive\.js"/);
  assert.match(worker, /atlas-offline-shell-v7/);
  assert.match(worker, /"\/atlas-local-responsive\.js"/);
});
