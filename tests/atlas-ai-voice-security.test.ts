import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Atlas voice permits only first-party microphone use while other sensitive browser features stay blocked", () => {
  const config = read("next.config.mjs");
  assert.match(config, /microphone=\(self\)/);
  assert.match(config, /camera=\(\)/);
  assert.match(config, /geolocation=\(\)/);
  assert.match(config, /payment=\(\)/);
  assert.match(config, /usb=\(\)/);
  assert.doesNotMatch(config, /microphone=\*/);
});
