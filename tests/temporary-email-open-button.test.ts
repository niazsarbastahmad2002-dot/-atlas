import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("temporary email success state waits for fresh mail and offers a native-first inbox handoff", async () => {
  const source = await read("app/login/legacy/legacy-login-form.tsx");

  assert.match(source, /openEmail: "Open newest email"/);
  assert.match(source, /emailArriving: "Your new Atlas email is arriving…"/);
  assert.match(source, /setTimeout\(\(\) => setEmailReady\(true\), 2500\)/);
  assert.match(source, /disabled=\{!emailReady\}/);
  assert.match(source, /onClick=\{\(\) => openEmailInbox\(email\)\}/);
  assert.match(source, /window\.location\.assign\("message:\/\/"\)/);
  assert.match(source, /package=com\.google\.android\.gm/);
  assert.match(source, /#search\/\$\{query\}/);
  assert.match(source, /subject:\"Atlas — Sign in\" newer_than:1d/);
  assert.match(source, /https:\/\/outlook\.live\.com\/mail\/0\/inbox/);
  assert.match(source, /https:\/\/www\.icloud\.com\/mail\//);
});
