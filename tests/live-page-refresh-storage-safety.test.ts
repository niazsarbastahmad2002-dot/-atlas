import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/components/live-page-refresh.tsx", import.meta.url), "utf8");

test("Safari stall recovery skips reload when session storage cannot safely throttle it", () => {
  assert.match(source, /function reserveSafariStallReload\(now: number\)/);
  assert.match(source, /window\.sessionStorage\.getItem\(key\)/);
  assert.match(source, /window\.sessionStorage\.setItem\(key, String\(now\)\)/);
  assert.match(source, /catch \{[\s\S]*return false;/);
  assert.match(source, /if \(!reserveSafariStallReload\(Date\.now\(\)\)\) return;/);
});
