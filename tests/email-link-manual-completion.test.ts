import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { extractAtlasMagicLinkToken } from "../lib/auth/atlas-email-link.ts";

const authHost = "https://example-project.supabase.co";
// Synthetic test-only values; never use or log real email sign-in tokens.
const token56 = "a".repeat(56);
const token64 = "b".repeat(64);
const token = token56;

function magicLink(params: Record<string, string> = {}) {
  const url = new URL("/auth/v1/verify", authHost);
  url.searchParams.set("token", token);
  url.searchParams.set("type", "magiclink");
  url.searchParams.set(
    "redirect_to",
    "https://atlasdemofixed.vercel.app/auth/callback?next=%2Fdashboard%2Fselect-clinic",
  );
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  return url.toString();
}

test("accepts exactly 56- and 64-character hexadecimal Atlas magic-link tokens", () => {
  for (const syntheticToken of [token56, token64, "A".repeat(56), "F".repeat(64)]) {
    assert.equal(extractAtlasMagicLinkToken(magicLink({ token: syntheticToken }), authHost), syntheticToken);
    assert.equal(extractAtlasMagicLinkToken("  " + magicLink({ token: syntheticToken }) + "\n", authHost), syntheticToken);
  }
});

test("rejects missing, nonhexadecimal or any token length other than exactly 56 or 64", () => {
  for (const length of [0, 1, 55, 57, 63, 65, 128]) {
    assert.equal(extractAtlasMagicLinkToken(magicLink({ token: "a".repeat(length) }), authHost), null, String(length));
  }
  for (const invalid of ["g".repeat(56), "g".repeat(64), "a".repeat(55) + "-", "b".repeat(63) + " "]) {
    assert.equal(extractAtlasMagicLinkToken(magicLink({ token: invalid }), authHost), null);
  }
  const missingToken = new URL(magicLink());
  missingToken.searchParams.delete("token");
  assert.equal(extractAtlasMagicLinkToken(missingToken.toString(), authHost), null);
});

test("rejects foreign auth providers, non-HTTPS and malformed links", () => {
  assert.equal(extractAtlasMagicLinkToken(magicLink().replace("example-project", "another-project"), authHost), null);
  assert.equal(extractAtlasMagicLinkToken(magicLink().replace("https:", "http:"), authHost), null);
  assert.equal(extractAtlasMagicLinkToken("not a link", authHost), null);
  assert.equal(extractAtlasMagicLinkToken("https://evil.example/auth/v1/verify?token=" + token + "&type=magiclink", authHost), null);
  assert.equal(extractAtlasMagicLinkToken("x".repeat(4097), authHost), null);
  assert.equal(extractAtlasMagicLinkToken(magicLink(), ""), null);
});

test("rejects different auth actions, insecure shapes and duplicate tokens", () => {
  assert.equal(extractAtlasMagicLinkToken(magicLink({ type: "recovery" }), authHost), null);
  assert.equal(extractAtlasMagicLinkToken(magicLink({ type: "signup" }), authHost), null);
  assert.equal(extractAtlasMagicLinkToken(magicLink({ token: "tiny" }), authHost), null);
  assert.equal(extractAtlasMagicLinkToken(magicLink().replace("/auth/v1/verify", "/auth/v1/admin"), authHost), null);
  for (const syntheticToken of [token56, token64]) {
    const link = magicLink({ token: syntheticToken });
    assert.equal(extractAtlasMagicLinkToken(link + "&token=" + syntheticToken, authHost), null);
    assert.equal(extractAtlasMagicLinkToken(link + "&token=" + token56, authHost), null);
    assert.equal(extractAtlasMagicLinkToken(link + "&type=magiclink", authHost), null);
  }
  assert.equal(extractAtlasMagicLinkToken(magicLink() + "#fragment", authHost), null);
  assert.equal(extractAtlasMagicLinkToken(magicLink().replace("https://", "https://user:password@"), authHost), null);
});

test("manual fallback verifies on the Atlas origin and does not navigate to the token URL", () => {
  const page = readFileSync(new URL("../app/auth/email/complete-link/page.tsx", import.meta.url), "utf8");
  assert.match(page, /extractAtlasMagicLinkToken/);
  assert.match(page, /if \(linkField\.current\) linkField\.current\.value = ""/);
  assert.match(page, /supabase\.auth\.verifyOtp\(\{/);
  assert.match(page, /token_hash: tokenHash/);
  assert.match(page, /type: "magiclink"/);
  assert.match(page, /!data\.session \|\| !data\.user/);
  assert.match(page, /window\.location\.replace\("\/auth\/activate\?next=/);
  assert.doesNotMatch(page, /window\.location\.(assign|replace)\(\s*tokenHash/);
  assert.doesNotMatch(page, /console\.(log|warn|error|debug)/);
  assert.doesNotMatch(page, /localStorage|sessionStorage/);
});
