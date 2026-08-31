import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("temporary email success state opens immediately and uses a native-first newest-message handoff", async () => {
  const source = await read("app/login/legacy/legacy-login-form.tsx");

  assert.match(source, /openEmail: "Open newest email"/);
  assert.doesNotMatch(source, /EMAIL_SYNC_GRACE_MS/);
  assert.doesNotMatch(source, /emailReady/);
  assert.doesNotMatch(source, /emailArriving/);
  assert.match(source, /onClick=\{\(\) => openEmailInbox\(email\)\}/);
  assert.match(source, /googlegmail:\/\/\/search\?query=\$\{query\}/);
  assert.match(source, /window\.location\.assign\("message:\/\/0"\)/);
  assert.match(source, /package=com\.google\.android\.gm/);
  assert.match(source, /is:unread subject:\"Atlas — Sign in\" newer_than:1d/);
  assert.match(source, /#search\/\$\{query\}/);
  assert.match(source, /https:\/\/outlook\.live\.com\/mail\/0\/inbox/);
  assert.match(source, /https:\/\/www\.icloud\.com\/mail\//);
});
