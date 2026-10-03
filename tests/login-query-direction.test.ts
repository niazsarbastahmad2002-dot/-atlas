import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const proxy = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");
const ui = readFileSync(new URL("../lib/i18n/ui.ts", import.meta.url), "utf8");
const server = readFileSync(new URL("../lib/i18n/ui-server.ts", import.meta.url), "utf8");

test("login query locale reaches the root layout before server rendering", () => {
  assert.match(ui, /export const uiLocaleCookie = "atlas_ui_locale"/);
  assert.match(proxy, /request\.nextUrl\.pathname === "\/login"/);
  assert.match(proxy, /request\.nextUrl\.searchParams\.get\("lang"\)/);
  assert.match(proxy, /if \(isUiLocale\(requestedLocale\)\) \{[\s\S]*request\.cookies\.set\(uiLocaleCookie, requestedLocale\)/);
  assert.match(proxy, /const response = await updateSession\(request\)/);
  assert.match(proxy, /response\.cookies\.set\(uiLocaleCookie, requestedLocale/);
  assert.match(server, /cookieStore\.get\(uiLocaleCookie\)/);
});

test("invalid login query locales are not written to Atlas locale state", () => {
  assert.match(proxy, /if \(isUiLocale\(requestedLocale\)\)/);
  assert.doesNotMatch(proxy, /request\.cookies\.set\(uiLocaleCookie, request\.nextUrl\.searchParams\.get/);
});
