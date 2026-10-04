import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("clinic switchers remount with the clinic currently being viewed", () => {
  const pages = [
    "app/dashboard/settings/page.tsx",
    "app/dashboard/history/page.tsx",
    "app/dashboard/assistant/page.tsx",
    "app/dashboard/activity/page.tsx",
    "app/dashboard/staff/page.tsx",
  ];

  for (const path of pages) {
    assert.match(read(path), /<form key=\{clinic\.id\}[^>]*(?:clinic-switcher|atlas-ai-clinic-switcher)/);
  }
});
