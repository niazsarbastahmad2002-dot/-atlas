import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../app/dashboard/app-navigation.tsx", import.meta.url), "utf8",
);

test("private Doctor navigation never warms protected routes without an action", () => {
  assert.doesNotMatch(source, /router\.prefetch\s*\(/);
  assert.doesNotMatch(source, /warmCoreRoutes|onPointerDown=\{warm\(|onMouseEnter=\{warm\(/);
  const links = [...source.matchAll(/<Link\b[^>]*>/gs)].map((match) => match[0]);
  assert.ok(links.length >= 7, "doctor topbar and phone navigation still render");
  for (const link of links) {
    assert.match(link, /prefetch=\{false\}/, "do not prefetch private pages in the background");
  }
});

test("deliberate navigation and pending-settings consistency remain operational", () => {
  assert.match(source, /router\.push\(href, \{ scroll: true \}\)/);
  assert.match(source, /flushSettingWrites\(\)/);
  assert.match(source, /window\.location\.assign\(href\)/);
  assert.match(source, /className="app-bottom-nav"/);
  assert.match(source, /className="app-topbar"/);
});
