import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { normalizeAtlasEmailOtp, normalizeAtlasEmailAddress } from "../lib/auth/atlas-email-otp.ts";

const child = readFileSync(new URL("../app/auth/email/complete-link/email-code-form.tsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../app/auth/email/complete-link/page.tsx", import.meta.url), "utf8");
const login = readFileSync(new URL("../app/login/legacy/legacy-login-form.tsx", import.meta.url), "utf8");
const sender = readFileSync(new URL("../app/api/auth/temporary-email/route.ts", import.meta.url), "utf8");
const activation = readFileSync(new URL("../app/auth/activate/route.ts", import.meta.url), "utf8");

test("OTP input accepts provider-supported range without assuming actual configured length", () => {
  for (const n of [6,7,8,9,10]) assert.equal(normalizeAtlasEmailOtp("1".repeat(n)), "1".repeat(n));
  for (const n of [0,1,5,11,32,33]) assert.equal(normalizeAtlasEmailOtp("1".repeat(n)), null);
  assert.equal(normalizeAtlasEmailOtp("١٢٣٤٥٦"), "123456");
  assert.equal(normalizeAtlasEmailOtp("۱۲۳۴۵۶"), "123456");
  assert.equal(normalizeAtlasEmailOtp("123 456"), "123456");
  for (const bad of ["1234ab", "123-456", " 12345 ", "123456&email=x"]) assert.equal(normalizeAtlasEmailOtp(bad), null);
});

test("email input is bounded, normalized and not used for arbitrary redirects", () => {
  assert.equal(normalizeAtlasEmailAddress("  QA@Example.COM "), "qa@example.com");
  assert.equal(normalizeAtlasEmailAddress("not-email"), null);
  assert.equal(normalizeAtlasEmailAddress("x".repeat(321) + "@test.com"), null);
});

test("manual code uses only existing Supabase browser client and server activation", () => {
  assert.match(child, /supabase\.auth\.verifyOtp\(\{ email, token, type: "email" \}\)/);
  assert.match(child, /if \(error \|\| !data\.session \|\| !data\.user\)/);
  assert.match(child, /window\.location\.replace\("\/auth\/activate\?next=%2Fdashboard%2Fselect-clinic"\)/);
  assert.match(activation, /supabase\.auth\.getUser\(\)/);
  assert.match(activation, /Clinic membership is never granted/);
  assert.match(page, /AtlasEmailCodeForm/);
  assert.match(login, /href="\/auth\/email\/complete-link"/);
  assert.match(sender, /admin\.auth\.signInWithOtp/);
  assert.match(sender, /shouldCreateUser: false/);
});

test("codes are ephemeral, cleared before provider call, double submits and page attempts bounded", () => {
  assert.match(child, /if \(codeField\.current\) codeField\.current\.value = ""/);
  assert.ok(child.indexOf('codeField.current.value = ""') < child.indexOf("supabase.auth.verifyOtp"));
  assert.match(child, /inFlight\.current \|\| attempts\.current >= 5/);
  assert.match(child, /attempts\.current \+= 1/);
  assert.match(child, /disabled=\{busy \|\| locked\}/);
  assert.doesNotMatch(child + page, /console\.(?:log|warn|error|debug)|localStorage|sessionStorage|new URLSearchParams\(\{.*token/i);
  assert.doesNotMatch(child, /useState\([^)]*token|type: "signup"|createAdminClient|service_role/i);
});

test("all four translations and accessible separate code form", () => {
  for (const locale of ["en", "ku", "bd", "ar"]) assert.ok(child.includes("  " + locale + ": {"));
  assert.match(child, /aria-labelledby="atlas-email-code-heading"/);
  assert.match(child, /inputMode="numeric"/);
  assert.match(child, /autoComplete="one-time-code"/);
  assert.match(child, /role="alert"/);
  assert.match(page, /extractAtlasMagicLinkToken/);
  assert.match(page, /token_hash: tokenHash/);
});
