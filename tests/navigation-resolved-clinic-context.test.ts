import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("core navigation follows the clinic actually resolved by the schedule", () => {
  const page = read("app/dashboard/page.tsx");
  const navigation = read("app/dashboard/app-navigation.tsx");

  assert.match(page, /data-atlas-clinic=\{clinic\.id\}/);
  assert.match(navigation, /function scheduleHrefForResolvedClinic\(href: string, clinicId: string \| null\)/);
  assert.match(navigation, /url\.searchParams\.set\("clinic", clinicId\)/);
  assert.match(navigation, /const resolvedClinic = workspace\?\.dataset\.atlasClinic \?\? null/);
  assert.match(navigation, /const candidate = scheduleHrefForResolvedClinic\(rawCandidate, resolvedClinic\)/);
  assert.match(navigation, /const clinic = resolvedClinic \?\? new URL\(current, window\.location\.origin\)\.searchParams\.get\("clinic"\)/);
  assert.match(navigation, /assistantHrefFrom\(scheduleHref, pathname === "\/dashboard" \? null : searchParams\.get\("clinic"\)\)/);
});
