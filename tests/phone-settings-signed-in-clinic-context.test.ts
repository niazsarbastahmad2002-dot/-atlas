import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("signed-in phone settings preserve the active clinic without changing auth routing", () => {
  const settings = read("app/dashboard/settings/page.tsx");
  const manager = read("app/dashboard/settings/phone-number-manager.tsx");
  const phonePage = read("app/dashboard/settings/phone/page.tsx");

  assert.match(settings, /PhoneNumberManager locale=\{locale\} currentPhone=\{userData\.user\.phone \?\? null\} clinicId=\{clinic\.id\}/);
  assert.match(manager, /new URLSearchParams\(\{ clinic: clinicId \}\)/);
  assert.match(phonePage, /searchParams: Promise<\{ clinic\?: string \}>/);
  assert.match(phonePage, /params\.clinic && isUuid\(params\.clinic\)/);
  assert.match(phonePage, /const backHref = clinicId \? .*clinic: clinicId/);
  assert.match(phonePage, /href=\{backHref\}/);
  assert.match(phonePage, /if \(!user\) redirect\("\/login\?next=\/dashboard\/settings\/phone"\)/);
});
