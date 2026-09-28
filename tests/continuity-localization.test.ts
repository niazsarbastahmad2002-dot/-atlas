import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const continuity = readFileSync(new URL("../app/dashboard/continuity-mode.tsx", import.meta.url), "utf8");
const layout = readFileSync(new URL("../app/dashboard/layout.tsx", import.meta.url), "utf8");

test("offline clinic continuity guidance follows the active Atlas interface language", () => {
  assert.match(layout, /<AtlasContinuityMode locale=\{locale\} \/>/);
  assert.match(continuity, /AtlasContinuityMode\(\{ locale \}: \{ locale: UiLocale \}\)/);
  assert.match(continuity, /Atlas is read-only while disconnected/);
  assert.match(continuity, /تا پەیوەندی ئینتەرنێت نییە/);
  assert.match(continuity, /هەتا گرێدانا ئینتەرنێتێ نەبیت/);
  assert.match(continuity, /أثناء انقطاع الإنترنت/);
});

test("offline last-sync time uses Atlas locale formatting in Baghdad time", () => {
  assert.match(continuity, /timeZone: "Asia\/Baghdad"/);
  assert.match(continuity, /formatTimeValue\(clock, locale\)/);
  assert.match(continuity, /syncTimeLabel\(lastSyncedAt, locale\)/);
});
