import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("invitation language survives a return to Atlas login", () => {
  const login = readFileSync(new URL("../app/login/page.tsx", import.meta.url), "utf8");
  const join = readFileSync(new URL("../app/join/[token]/page.tsx", import.meta.url), "utf8");

  assert.match(login, /lang\?: string \| string\[\]/);
  assert.match(login, /isUiLocale\(requestedLang\) \? requestedLang : await getUiLocale\(\)/);
  assert.match(join, /\/login\?lang=\$\{encodeURIComponent\(locale\)\}/);
});
