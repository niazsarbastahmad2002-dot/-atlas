import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("core navigation follows the clinic actually resolved by the schedule", () => {
  const page = read("app/dashboard/page.tsx");
  const loading = read("app/dashboard/loading.tsx");
  const navigation = read("app/dashboard/app-navigation.tsx");

  assert.match(page, /data-atlas-clinic=\{clinic\.id\}/);
  assert.doesNotMatch(loading, /data-atlas-clinic/);
  assert.match(navigation, /function scheduleHrefForResolvedClinic\(href: string, clinicId: string \| null\)/);
  assert.match(navigation, /url\.searchParams\.set\("clinic", clinicId\)/);
  assert.match(navigation, /querySelector<HTMLElement>\("\.workspace-page\[data-atlas-clinic\]"\)/);
  assert.match(navigation, /if \(!resolvedClinic\) return false/);
  assert.match(navigation, /const candidate = scheduleHrefForResolvedClinic\(rawCandidate, resolvedClinic\)/);
  assert.match(navigation, /setSettingsHref\(\`\/dashboard\/settings\?\$\{new URLSearchParams\(\{ clinic: resolvedClinic \}\)\}\`\)/);
  assert.match(navigation, /setScheduleHref\("\/dashboard"\);[\s\S]*setSettingsHref\("\/dashboard\/settings"\)/);
  assert.match(navigation, /const observer = new MutationObserver\(\(\) => \{/);
  assert.match(navigation, /if \(syncResolvedSchedule\(\)\) observer\.disconnect\(\)/);
  assert.match(navigation, /attributeFilter: \["data-atlas-clinic", "data-atlas-memory-valid"\]/);
  assert.match(navigation, /return \(\) => observer\.disconnect\(\)/);
  assert.match(navigation, /assistantHrefFrom\(scheduleHref, pathname === "\/dashboard" \? null : searchParams\.get\("clinic"\)\)/);
});
