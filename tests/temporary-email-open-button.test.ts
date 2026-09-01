import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("temporary email success state opens the best mail app automatically with web only as fallback", async () => {
  const source = await read("app/login/legacy/legacy-login-form.tsx");

  assert.match(source, /openEmail: "Open newest email"/);
  assert.doesNotMatch(source, /chooseApp:/);
  assert.doesNotMatch(source, /changeApp:/);
  assert.doesNotMatch(source, /EMAIL_OPEN_PREFERENCE_PREFIX/);
  assert.doesNotMatch(source, /localStorage/);
  assert.doesNotMatch(source, /availableEmailChoices/);
  assert.doesNotMatch(source, /handleEmailChoice/);
  assert.match(source, /openEmailInbox\(email\)/);
  assert.match(source, /openExternalApp\("message:\/\/", afterAppleMail, 1200\)/);
  assert.match(source, /openExternalApp\("googlegmail:\/\/", fallback, 1000\)/);
  assert.doesNotMatch(source, /googlegmail:\/\/\/search\?query=/);
  assert.match(source, /package=com\.google\.android\.gm/);
  assert.match(source, /S\.browser_fallback_url/);
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
