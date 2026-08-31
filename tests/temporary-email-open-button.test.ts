import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("temporary email success state waits for sync and focuses Atlas sign-in mail", async () => {
  const source = await read("app/login/legacy/legacy-login-form.tsx");

  assert.match(source, /openEmail: "Open newest email"/);
  assert.match(source, /MAIL_SYNC_SETTLE_MS = 2500/);
  assert.match(source, /openingEmail \? copy\.openingEmail : copy\.openEmail/);
  assert.match(source, /window\.location\.assign\("message:\/\/"\)/);
  assert.match(source, /package=com\.google\.android\.gm/);
  assert.match(source, /ATLAS_SIGN_IN_SEARCH/);
  assert.match(source, /#search\/\$\{encodeURIComponent\(ATLAS_SIGN_IN_SEARCH\)\}/);
  assert.match(source, /https:\/\/outlook\.live\.com\/mail\/0\/inbox/);
  assert.match(source, /https:\/\/www\.icloud\.com\/mail\//);
});
