import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("today's receptionist schedule advances after Baghdad midnight", () => {
  const source = readFileSync(
    new URL("../app/dashboard/dashboard-day-rollover.tsx", import.meta.url),
    "utf8",
  );
  const page = readFileSync(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8");

  assert.match(source, /timeZone: "Asia\/Baghdad"/);
  assert.match(source, /if \(selectedDay !== todayAtRender\) return/);
  assert.match(source, /window\.setInterval\(refreshForNewClinicDay, 30_000\)/);
  assert.match(source, /visibilitychange/);
  assert.match(source, /url\.searchParams\.set\("day", liveDay\)/);
  assert.match(source, /url\.searchParams\.delete\("notice"\)/);
  assert.match(source, /window\.location\.replace/);
  assert.match(page, /<DashboardDayRollover selectedDay=\{selectedDay\} todayAtRender=\{today\} \/>/);
});
