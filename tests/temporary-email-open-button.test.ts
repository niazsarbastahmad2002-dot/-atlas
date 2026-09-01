import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("temporary email success state offers and remembers a provider-aware mail app choice", async () => {
  const source = await read("app/login/legacy/legacy-login-form.tsx");

  assert.match(source, /openEmail: "Open newest email"/);
  assert.match(source, /chooseApp: "Where do you read this email\?"/);
  assert.match(source, /changeApp: "Change email app"/);
  assert.match(source, /EMAIL_OPEN_PREFERENCE_PREFIX/);
  assert.match(source, /window\.localStorage\.setItem/);
  assert.match(source, /window\.localStorage\.getItem/);
  assert.match(source, /availableEmailChoices\(email\)/);
  assert.match(source, /handleEmailChoice\("gmail"\)/);
  assert.match(source, /handleEmailChoice\("apple"\)/);
  assert.match(source, /handleEmailChoice\("browser"\)/);
  assert.match(source, /window\.location\.assign\("googlegmail:\/\/"\)/);
  assert.doesNotMatch(source, /googlegmail:\/\/\/search\?query=/);
  assert.match(source, /window\.location\.assign\("message:\/\/"\)/);
  assert.match(source, /package=com\.google\.android\.gm/);
  assert.doesNotMatch(source, /S\.browser_fallback_url/);
  assert.match(source, /in:anywhere/);
  assert.match(source, /Atlas — Sign in/);
  assert.match(source, /Atlas — Confirm your email/);
  assert.match(source, /#search\/\$\{query\}/);
  assert.match(source, /https:\/\/outlook\.live\.com\/mail\/0\/inbox/);
  assert.match(source, /https:\/\/www\.icloud\.com\/mail\//);
  assert.doesNotMatch(source, /EMAIL_SYNC_GRACE_MS/);
  assert.doesNotMatch(source, /emailReady/);
  assert.doesNotMatch(source, /emailArriving/);
});