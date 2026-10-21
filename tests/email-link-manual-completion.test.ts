import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { extractAtlasMagicLinkToken } from "../lib/auth/atlas-email-link.ts";

const authHost = "https://example-project.supabase.co";
const token = "a".repeat(64);

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

test("extracts only the one-time token hash from a valid Atlas magic link", () => {
  assert.equal(extractAtlasMagicLinkToken(magicLink(), authHost), token);
  assert.equal(extractAtlasMagicLinkToken("  " + magicLink() + "\n", authHost), token);
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
  assert.equal(extractAtlasMagicLinkToken(magicLink() + "&token=" + token, authHost), null);
  assert.equal(extractAtlasMagicLinkToken(magicLink() + "&type=magiclink", authHost), null);
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
