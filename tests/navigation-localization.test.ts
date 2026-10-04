import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Atlas AI and navigation chrome use the selected interface language", () => {
  const navigation = source("app/dashboard/app-navigation.tsx");

  for (const expected of [
    'navigation: "Atlas navigation"',
    'askAtlas: "Ask Atlas"',
    'navigation: "ڕێنوێنی Atlas"',
    'mobileNavigation: "ڕێنوێنی مۆبایلی Atlas"',
    'askAtlas: "لە Atlas بپرسە"',
    'beta: "تاقیکردنەوە"',
    'navigation: "ڕێنیشاندانا Atlas"',
    'mobileNavigation: "ڕێنیشاندانا موبایلا Atlas"',
    'askAtlas: "ژ Atlas بپرسە"',
    'beta: "تاقیکرنەوە"',
    'navigation: "التنقل في Atlas"',
    'mobileNavigation: "تنقل Atlas على الهاتف"',
    'askAtlas: "اسأل Atlas"',
    'beta: "تجريبي"',
  ]) {
    assert.ok(navigation.includes(expected), `missing localized navigation copy: ${expected}`);
  }

  assert.match(navigation, /aria-label=\{nav\.navigation\}/);
  assert.match(navigation, /aria-label=\{nav\.askAtlas\}/);
  assert.match(navigation, /<span>\{nav\.askAtlas\}<\/span>/);
  assert.match(navigation, /<small>\{nav\.beta\}<\/small>/);
  assert.match(navigation, /aria-label=\{nav\.mobileNavigation\}/);
});


test("core route prefetch pauses while Atlas is hidden and warms on return", () => {
  const navigation = source("app/dashboard/app-navigation.tsx");

  assert.match(navigation, /document\.visibilityState !== "visible"/);
  assert.match(navigation, /window\.clearInterval\(timer\)/);
  assert.match(navigation, /timer = window\.setInterval\(warmCoreRoutes, 20_000\)/);
  assert.match(navigation, /const syncVisibility = \(\) => \{[\s\S]*warmCoreRoutes\(\);[\s\S]*start\(\)/);
  assert.match(navigation, /document\.addEventListener\("visibilitychange", syncVisibility\)/);
  assert.match(navigation, /document\.removeEventListener\("visibilitychange", syncVisibility\)/);
});


test("activity history stays inside the Settings navigation section", () => {
  const navigation = source("app/dashboard/app-navigation.tsx");

  assert.match(navigation, /visiblePath\.startsWith\("\/dashboard\/activity"\)/);
});


test("active navigation links expose current-page semantics", () => {
  const navigation = source("app/dashboard/app-navigation.tsx");

  assert.ok((navigation.match(/aria-current=\{onSchedule \? "page" : undefined\}/g) ?? []).length >= 2);
  assert.match(navigation, /aria-current=\{onAssistant \? "page" : undefined\}/);
  assert.ok((navigation.match(/aria-current=\{onSettings \? "page" : undefined\}/g) ?? []).length >= 2);
});


test("remembered schedule links drop transient result parameters", () => {
  const navigation = source("app/dashboard/app-navigation.tsx");

  assert.match(navigation, /\["notice", "error", "after"\]\.forEach\(\(key\) => url\.searchParams\.delete\(key\)\)/);
});


test("professional dashboard visibly identifies the Atlas Doctor side", () => {
  const navigation = source("app/dashboard/app-navigation.tsx");

  assert.match(navigation, /<span className="app-brand-product" aria-hidden="true">Doctor<\/span>/);
  assert.match(navigation, /\.app-brand-product\{/);
});
