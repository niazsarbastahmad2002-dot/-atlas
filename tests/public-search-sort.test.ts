import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/care/page.tsx", import.meta.url), "utf8");

test("public doctor search accepts only known sort values", () => {
  assert.match(page, /sort\?: string \| string\[\]/);
  assert.match(page, /const sort = sortValue === "soonest" \? "soonest" : "name"/);
});

test("soonest sorting places known openings first and null openings last", () => {
  assert.match(page, /sort === "soonest"/);
  assert.match(page, /new Date\(a\.next_available_at\)\.getTime\(\) - new Date\(b\.next_available_at\)\.getTime\(\)/);
  assert.match(page, /if \(a\.next_available_at\) return -1/);
  assert.match(page, /if \(b\.next_available_at\) return 1/);
  assert.match(page, /a\.doctor_name\.localeCompare\(b\.doctor_name\)/);
});

test("search form exposes localized name and soonest sort choices", () => {
  assert.match(page, /<select name="sort" defaultValue=\{sort\}>/);
  assert.match(page, /<option value="name">\{copy\.sortName\}<\/option>/);
  assert.match(page, /<option value="soonest">\{copy\.sortSoonest\}<\/option>/);
  assert.match(page, /Soonest open time/);
  assert.match(page, /نزیکترین کاتی بەردەست/);
  assert.match(page, /أقرب وقت متاح/);
});

test("sort control stays mobile friendly", () => {
  assert.match(page, /atlas-care-search input,\.atlas-care-search select\{min-height:48px\}/);
  assert.match(page, /@media\(max-width:760px\)\{\.atlas-care-search\{grid-template-columns:1fr\}/);
});
