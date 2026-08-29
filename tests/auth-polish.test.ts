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

test("all phone OTP entry is paste-friendly and phone values stay direction-safe", () => {
  const otp = read("app/components/otp-code-field.tsx");
  const css = read("app/atlas-auth-polish.css");
  const phoneManager = read("app/dashboard/settings/phone-number-manager.tsx");
  const phoneChange = read("app/dashboard/settings/phone-change-form.tsx");

  assert.match(otp, /navigator\.clipboard\.readText/);
  assert.match(otp, /autoComplete="one-time-code"/);
  assert.match(otp, /onFocus=/);
  assert.match(phoneChange, /<OtpCodeField/);
  assert.match(phoneChange, /pasteLabel=\{copy\.paste\}/);
  assert.match(phoneChange, /className="auth-phone-value" dir="ltr" lang="en"/);
  assert.match(css, /unicode-bidi: isolate-override/);
  assert.match(phoneManager, /dir="ltr" lang="en"/);
});

test("explicit Light mode overrides browser color-scheme forcing", () => {
  const layout = read("app/layout.tsx");
  const css = read("app/atlas-auth-polish.css");

  assert.match(layout, /atlas-auth-polish\.css/);
  assert.match(css, /html\[data-theme="light"\]/);
  assert.match(css, /color-scheme: only light !important/);
});

test("production authentication polish does not add test-only Meta transport flags", () => {
  const login = read("app/login/login-form.tsx");
  const join = read("app/join/[token]/join-auth.tsx");

  assert.doesNotMatch(login, /DIRECT_META_OTP_ENABLED|ATLAS_WHATSAPP_MODE|meta_test/);
  assert.doesNotMatch(join, /DIRECT_META_OTP_ENABLED|ATLAS_WHATSAPP_MODE|meta_test/);
});
