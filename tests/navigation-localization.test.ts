import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Atlas AI and navigation chrome use the selected interface language", () => {
  const navigation = source("app/dashboard/app-navigation.tsx");

  for (const locale of ["en", "ku", "bd", "ar"]) {
    assert.match(navigation, new RegExp(`${locale}: \\{[\\s\\S]*navigation:[\\s\\S]*mobileNavigation:[\\s\\S]*askAtlas:[\\s\\S]*beta:`));
  }
  assert.match(navigation, /aria-label=\{nav\.navigation\}/);
  assert.match(navigation, /aria-label=\{nav\.askAtlas\}/);
  assert.match(navigation, /<span>\{nav\.askAtlas\}<\/span>/);
  assert.match(navigation, /<small>\{nav\.beta\}<\/small>/);
  assert.match(navigation, /aria-label=\{nav\.mobileNavigation\}/);
});
