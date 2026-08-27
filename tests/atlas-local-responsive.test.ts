import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Atlas Local responsive fixes keep date and appointment controls from colliding", () => {
  const responsive = source("public/atlas-local-responsive.js");
  assert.match(responsive, /grid-template-columns: max-content minmax\(0, 1fr\) max-content max-content/);
  assert.match(responsive, /\.day-input[\s\S]*min-width: 0/);
  assert.match(responsive, /#today-day[\s\S]*margin-inline-start: 4px/);
  assert.match(responsive, /\.composer-grid[\s\S]*minmax\(180px, 1\.3fr\)[\s\S]*minmax\(150px, \.65fr\)/);
  assert.match(responsive, /\.composer-grid \.button[\s\S]*grid-column: 1 \/ -1[\s\S]*width: 100%/);
});

test("Atlas Local hides Safari date affordance without changing the native date input type", () => {
  const responsive = source("public/atlas-local-responsive.js");
  const shell = source("public/atlas-local.html");
  assert.match(shell, /id="selected-day" type="date"/);
  assert.match(responsive, /input\[type="date"\][\s\S]*-webkit-appearance: none/);
  assert.match(responsive, /input\[type="date"\]::\-webkit-calendar-picker-indicator[\s\S]*display: none/);
});

test("Atlas Local hides Safari time affordance without changing the native time input type", () => {
  const responsive = source("public/atlas-local-responsive.js");
  const shell = source("public/atlas-local.html");
  assert.match(shell, /id="appointment-time" type="time"/);
  assert.match(responsive, /input\[type="time"\][\s\S]*-webkit-appearance: none/);
  assert.match(responsive, /::-webkit-calendar-picker-indicator[\s\S]*display: none/);
  assert.match(responsive, /::-webkit-date-and-time-value[\s\S]*text-align: center/);
});

test("Atlas Local status controls remain readable across desktop, tablets and phones", () => {
  const responsive = source("public/atlas-local-responsive.js");
  assert.match(responsive, /\.appointment[\s\S]*minmax\(210px, 260px\)/);
  assert.match(responsive, /@media \(max-width: 1100px\)/);
  assert.match(responsive, /@media \(max-width: 900px\)/);
  assert.match(responsive, /@media \(max-width: 640px\)/);
  assert.match(responsive, /\.status-select\[data-status="pending"\]/);
  assert.match(responsive, /\.status-select\[data-status="waiting"\]/);
  assert.match(responsive, /\.call-link[\s\S]*display: inline-flex/);
  assert.match(responsive, /\.queue-empty[\s\S]*visibility: hidden/);
});

test("Atlas Local loader and offline cache include the responsive fixes", () => {
  const loader = source("public/atlas-local.js");
  const worker = source("public/atlas-sw.js");
  assert.match(loader, /"\/atlas-local-responsive\.js"/);
  assert.match(worker, /atlas-offline-shell-v11/);
  assert.match(worker, /"\/atlas-local-responsive\.js"/);
});
