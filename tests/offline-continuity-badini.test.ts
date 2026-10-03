import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const offline = readFileSync(new URL("../public/atlas-offline.html", import.meta.url), "utf8");

test("offline continuity distinguishes Badini from Sorani snapshots", () => {
  assert.match(offline, /if \(language === "ku" \|\| language\.startsWith\("ku-"\)\) return "bd"/);
  assert.match(offline, /if \(language\.startsWith\("ckb"\)\) return "ku"/);
  assert.match(offline, /bd: \{\s*offline: "ئۆفلاین · تەنێ بۆ دیتنێ"/);
  assert.match(offline, /bd: \{ pending: "چاڤەڕێ", confirmed: "پشتڕاستکری"/);
  assert.match(offline, /locale === "ku" \|\| locale === "bd" \? "ckb-IQ"/);
});

test("offline continuity keeps Badini as an RTL Kurdish document language", () => {
  assert.match(offline, /document\.documentElement\.lang = locale === "ku" \? "ckb" : locale === "bd" \? "ku" : locale/);
  assert.match(offline, /document\.documentElement\.dir = locale === "en" \? "ltr" : "rtl"/);
});
