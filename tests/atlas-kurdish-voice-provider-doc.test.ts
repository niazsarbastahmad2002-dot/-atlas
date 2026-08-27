import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const doc = fs.readFileSync(path.join(process.cwd(), "docs/atlas-kurdish-voice-provider.md"), "utf8");

test("Kurdish voice provider documentation keeps the privacy and server-only boundary explicit", () => {
  assert.match(doc, /ATLAS_KURDISH_STT_API_KEY/);
  assert.match(doc, /server-only/);
  assert.match(doc, /patient-identifying/);
  assert.doesNotMatch(doc, /NEXT_PUBLIC_ATLAS_KURDISH_STT_API_KEY/);
});
