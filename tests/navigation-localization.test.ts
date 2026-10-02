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
