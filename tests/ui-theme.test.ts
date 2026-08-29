import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { defaultUiTheme, isUiTheme } from "../lib/i18n/ui-theme.ts";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Atlas appearance supports Light Dark and System with Light as the stable default", () => {
  assert.equal(defaultUiTheme, "light");
  assert.equal(isUiTheme("light"), true);
  assert.equal(isUiTheme("dark"), true);
  assert.equal(isUiTheme("system"), true);
  assert.equal(isUiTheme("auto-dark"), false);
});

test("appearance preference is site-wide, persisted, and can override browser-forced dark mode", () => {
  const layout = read("app/layout.tsx");
  const route = read("app/api/ui-theme/route.ts");
  const control = read("app/dashboard/settings/interface-language-control.tsx");
  const css = read("app/atlas-theme.css");

  assert.match(layout, /data-theme=\{theme\}/);
  assert.match(layout, /getUiTheme/);
  assert.match(route, /atlas_ui_theme|uiThemeCookie/);
  assert.match(control, /Light/);
  assert.match(control, /Dark/);
  assert.match(control, /System/);
  assert.match(control, /\/api\/ui-theme/);
  assert.match(css, /data-theme="light"/);
  assert.match(css, /color-scheme: only light/);
  assert.match(css, /data-theme="dark"/);
  assert.match(css, /prefers-color-scheme: dark/);
});
