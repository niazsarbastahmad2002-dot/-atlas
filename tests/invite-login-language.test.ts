import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("invitation language survives a return to Atlas login", () => {
  const login = readFileSync(new URL("../app/login/page.tsx", import.meta.url), "utf8");
  const join = readFileSync(new URL("../app/join/[token]/page.tsx", import.meta.url), "utf8");
  const loginPicker = readFileSync(new URL("../app/login/language-picker.tsx", import.meta.url), "utf8");
  const joinPicker = readFileSync(new URL("../app/join/[token]/join-language-picker.tsx", import.meta.url), "utf8");

  assert.match(login, /lang\?: string \| string\[\]/);
  assert.match(login, /isUiLocale\(requestedLang\) \? requestedLang : await getUiLocale\(\)/);
  assert.match(join, /\/login\?lang=\$\{encodeURIComponent\(locale\)\}/);
  assert.match(join, /<JoinLanguagePicker locale=\{locale\} label=\{t\.language\} \/>/);
  assert.match(loginPicker, /url\.searchParams\.set\("lang", value\)/);
  assert.match(loginPicker, /window\.location\.assign\(url\.toString\(\)\)/);
  assert.match(joinPicker, /fetch\("\/api\/ui-language"/);
  assert.match(joinPicker, /url\.searchParams\.set\("lang", value\)/);
  assert.match(joinPicker, /window\.location\.assign\(url\.toString\(\)\)/);
});
