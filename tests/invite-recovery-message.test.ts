import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("expired receptionist invitation has a dedicated localized recovery message", () => {
  const login = readFileSync(new URL("../app/login/page.tsx", import.meta.url), "utf8");
  const finish = readFileSync(new URL("../app/join/[token]/finish/route.ts", import.meta.url), "utf8");

  assert.match(finish, /\/login\?error=invalid_invite/);
  assert.match(login, /invalidInvite: string/);
  assert.match(login, /error === "invalid_invite" \? copy\.invalidInvite/);
  assert.match(login, /Ask the clinic administrator to send a fresh invitation/);
  assert.match(login, /داوا لە بەڕێوەبەری کلینیک بکە/);
  assert.match(login, /ژ بەڕێڤەبەرێ کلینیکێ بخوازە/);
  assert.match(login, /اطلب من مسؤول العيادة إرسال دعوة جديدة/);
});
