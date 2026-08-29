import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("staff invitation carries the sender interface language through join and redemption", () => {
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

test("staff invite form always renders the recipient phone field while transport readiness only gates sending", () => {
  const form = read("app/dashboard/staff/invite-link-form.tsx");

  assert.match(form, /<label htmlFor="invite_recipient_phone">\{t\.phone\}<\/label>/);
  assert.match(form, /id="invite_recipient_phone"/);
  assert.match(form, /name="recipient_phone"/);
  assert.doesNotMatch(form, /\{directWhatsAppInvites \? \(\s*<>\s*<label htmlFor="invite_recipient_phone"/s);
  assert.match(form, /disabled=\{pending \|\| doctors\.length === 0 \|\| !directWhatsAppInvites\}/);
  assert.match(form, /!transportChecked \? t\.checking : directWhatsAppInvites \? t\.phoneHelp : t\.unavailable/);
});
