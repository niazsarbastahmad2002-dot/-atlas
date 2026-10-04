import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("public doctor search accepts only known sort values and sends sorting to the RPC", () => {
  const page = source("app/care/page.tsx");
  assert.match(page, /sort\?: string \| string\[\]/);
  assert.match(page, /const sort = sortValue === "soonest" \? "soonest" : "name"/);
  assert.match(page, /p_sort: sort/);
  assert.doesNotMatch(page, /rawResults|localeCompare\(b\.doctor_name\)/);
});

test("database ranks all matching doctors before the 30-result limit", () => {
  const migration = source("supabase/migrations/20261004000928_public_search_sort_before_limit.sql");
  const orderIndex = migration.indexOf("order by\n    case when");
  const limitIndex = migration.indexOf("limit greatest");
  assert.ok(orderIndex >= 0 && limitIndex > orderIndex);
  assert.match(migration, /left join lateral[\s\S]*list_public_doctor_slots/);
  assert.match(migration, /next_slot\.slot_at is null then 1 else 0/);
  assert.match(migration, /case when coalesce\(p_sort, 'name'\) = 'soonest' then next_slot\.slot_at end/);
});

test("search form exposes localized sort choices and stacks by iPad portrait widths", () => {
  const page = source("app/care/page.tsx");
  assert.match(page, /<select name="sort" defaultValue=\{sort\}>/);
  assert.match(page, /Soonest open time/);
  assert.match(page, /نزیکترین کاتی بەردەست/);
  assert.match(page, /أقرب وقت متاح/);
  assert.match(page, /@media\(max-width:900px\)\{\.atlas-care-search\{grid-template-columns:1fr\}/);
  assert.match(page, /atlas-care-search input,\.atlas-care-search select\{min-width:0;min-height:48px\}/);
});
