import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("production CSP permits the Meta Embedded Signup SDK without opening broad third-party script access", () => {
  const config = readFileSync("next.config.mjs", "utf8");

  assert.match(config, /script-src 'self' 'unsafe-inline' https:\/\/connect\.facebook\.net/);
  assert.match(config, /connect-src[^\n]*https:\/\/graph\.facebook\.com[^\n]*https:\/\/www\.facebook\.com/);
  assert.match(config, /frame-src 'self' https:\/\/www\.facebook\.com/);
  assert.doesNotMatch(config, /script-src[^\n]*https:\/\/\*/);
  assert.doesNotMatch(config, /script-src[^\n]*\*/);
});
