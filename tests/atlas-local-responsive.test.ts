import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Atlas Local responsive fixes keep date and appointment controls from colliding", () => {
  const responsive = source("public/atlas-local-responsive.js");
  assert.match(responsive, /grid-template-columns: max-content minmax\(0, 1fr\) max-content max-content/);
  assert.match(responsive, /\.day-input[\s\S]*min-width: 0/);
  assert.match(responsive, /#today-day[\s\S]*margin-inline-start: 2px/);
  assert.match(responsive, /\.composer-grid[\s\S]*minmax\(180px, 1\.3fr\)[\s\S]*minmax\(150px, \.65fr\)/);
  assert.match(responsive, /\.composer-grid \.button[\s\S]*grid-column: 1 \/ -1[\s\S]*width: 100%/);
});

test("Atlas Local hides Safari time affordance without changing the native time input type", () => {
  const responsive = source("public/atlas-local-responsive.js");
  const shell = source("public/atlas-local.html");
  assert.match(shell, /id="appointment-time" type="time"/);
  assert.match(responsive, /input\[type="time"\][\s\S]*-webkit-appearance: none/);
  assert.match(responsive, /::-webkit-calendar-picker-indicator[\s\S]*display: none/);
  assert.match(responsive, /::-webkit-date-and-time-value[\s\S]*text-align: center/);
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
  assert.match(worker, /atlas-offline-shell-v9/);
  assert.match(worker, /"\/atlas-local-responsive\.js"/);
});
