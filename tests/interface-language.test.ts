import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("signed-in interface language changes save immediately and reload the workspace", () => {
  const settings = read("app/dashboard/settings/page.tsx");
  const control = read("app/dashboard/settings/interface-language-control.tsx");

  assert.match(settings, /<InterfaceLanguageControl/);
  assert.match(control, /onChange=\{\(event\) => \{/);
  assert.match(control, /void applyLanguage\(nextLocale\)/);
  assert.match(control, /fetch\("\/api\/ui-language"/);
  assert.match(control, /credentials: "same-origin"/);
  assert.match(control, /cache: "no-store"/);
  assert.match(control, /window\.location\.reload\(\)/);
});

test("interface language endpoint keeps the preference in a secure site-wide cookie", () => {
  const route = read("app/api/ui-language/route.ts");

  assert.match(route, /response\.cookies\.set\(uiLocaleCookie, locale/);
  assert.match(route, /path: "\/"/);
  assert.match(route, /sameSite: "lax"/);
  assert.match(route, /httpOnly: true/);
});
