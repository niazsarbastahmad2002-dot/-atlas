import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("production staff invitation carries the sender interface language through join and redemption", () => {
  const action = read("app/dashboard/staff/invite-actions.ts");
  const page = read("app/join/[token]/page.tsx");
  const auth = read("app/join/[token]/join-auth.tsx");
  const finish = read("app/join/[token]/finish/route.ts");

  assert.match(action, /getUiLocale/);
  assert.match(action, /\?lang=\$\{encodeURIComponent\(inviteLocale\)\}/);
  assert.match(page, /searchParams/);
  assert.match(page, /isUiLocale\(requestedLang\)/);
  assert.match(page, /finish\?lang=\$\{encodeURIComponent\(locale\)\}/);
  assert.match(auth, /finish\?lang=\$\{encodeURIComponent\(locale\)\}/);
  assert.match(finish, /uiLocaleCookie/);
  assert.match(finish, /requestUrl\.searchParams\.get\("lang"\)/);
  assert.match(finish, /response\.cookies\.set\(uiLocaleCookie, locale/);
});

test("production invite RPC calls remain bound to their Supabase client", () => {
  const action = read("app/dashboard/staff/invite-actions.ts");
  const page = read("app/join/[token]/page.tsx");
  const finish = read("app/join/[token]/finish/route.ts");

  assert.match(action, /\.call\(admin, name, args\)/);
  assert.match(page, /\.call\(admin, name, args\)/);
  assert.match(finish, /\.call\(admin, name, args\)/);
});
