import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("login and receptionist verification use the shared touch-friendly delivery chooser", () => {
  const selector = read("app/components/auth-delivery-selector.tsx");
  const login = read("app/login/login-form.tsx");
  const join = read("app/join/[token]/join-auth.tsx");
  const css = read("app/atlas-auth-polish.css");

  assert.match(selector, /AuthDeliverySelector/);
  assert.match(selector, /WhatsAppIcon/);
  assert.match(selector, /SmsIcon/);
  assert.match(login, /<AuthDeliverySelector/);
  assert.match(join, /<AuthDeliverySelector/);
  assert.match(css, /\.auth-delivery-choice/);
  assert.match(css, /@media \(max-width: 520px\)/);
});

test("OTP entry is paste-friendly and phone values stay direction-safe", () => {
  const otp = read("app/components/otp-code-field.tsx");
  const theme = read("app/atlas-auth-polish.css");
  const phoneManager = read("app/dashboard/settings/phone-number-manager.tsx");

  assert.match(otp, /navigator\.clipboard\.readText/);
  assert.match(otp, /autoComplete="one-time-code"/);
  assert.match(otp, /onFocus=/);
  assert.match(theme, /unicode-bidi: isolate-override/);
  assert.match(phoneManager, /dir="ltr" lang="en"/);
});

test("explicit Light mode overrides browser color-scheme forcing", () => {
  const css = read("app/atlas-auth-polish.css");
  assert.match(css, /html\[data-theme="light"\]/);
  assert.match(css, /color-scheme: only light !important/);
});

test("Meta test fallback copy follows Atlas locale while production remains template-first", () => {
  const hook = read("app/api/auth/send-sms-hook/route.ts");
  const invite = read("app/dashboard/staff/invite-actions.ts");
  const hookParser = read("lib/auth/send-sms-hook.ts");

  assert.match(hookParser, /atlas_locale/);
  assert.match(hook, /testOtpMessage/);
  assert.match(hook, /کۆدی پشتڕاستکردنەوەی Atlas/);
  assert.match(invite, /testInviteMessage/);
  assert.match(invite, /بانگهێشتی Atlas/);
  assert.match(invite, /sendWhatsAppStaffInviteTemplate/);
});
