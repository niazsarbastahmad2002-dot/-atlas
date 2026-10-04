import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/staff/page.tsx", import.meta.url), "utf8");

test("staff directory reads continue beyond the first Supabase auth page", () => {
  assert.match(source, /const pageSize = 1000/);
  assert.match(source, /for \(let page = 1; page <= maxPages; page \+= 1\)/);
  assert.match(source, /listUsers\(\{ page, perPage: pageSize \}\)/);
  assert.match(source, /directoryUsers\.push\(\.\.\.directoryPage\.users\)/);
  assert.match(source, /if \(directoryPage\.users\.length < pageSize\) break/);
  assert.match(source, /listUsers\(\{ page: maxPages \+ 1, perPage: 1 \}\)/);
  assert.match(source, /if \(overflowPage\.users\.length > 0\) throw new Error\("staff_directory_too_large"\)/);
  assert.match(source, /new Map\(directoryUsers\.map/);
  assert.match(source, /pendingRows = directoryUsers\.flatMap/);
});
