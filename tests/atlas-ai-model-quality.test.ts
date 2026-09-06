import assert from "node:assert/strict";
import test from "node:test";
import {
  ATLAS_AI_MULTILINGUAL_MODEL,
  atlasAnswerNeedsKurdishRefinement,
  atlasCloudflareModelOrder,
  isAcceptableAtlasModelAnswer,
} from "../lib/atlas-ai-model-quality.ts";

const defaultModel = "@cf/openai/gpt-oss-120b";

test("Kurdish and Iraqi Arabic prefer the multilingual Atlas fallback writer", () => {
  for (const locale of ["ku", "bd", "ar"] as const) {
    const order = atlasCloudflareModelOrder(locale, defaultModel);
    assert.equal(order[0], ATLAS_AI_MULTILINGUAL_MODEL);
    assert.equal(order[1], defaultModel);
  }
});

test("English keeps the reasoning fallback first with multilingual fallback", () => {
  const order = atlasCloudflareModelOrder("en", defaultModel);
  assert.deepEqual(order, [defaultModel, ATLAS_AI_MULTILINGUAL_MODEL]);
});

test("model order never calls the same model twice", () => {
  assert.deepEqual(atlasCloudflareModelOrder("ku", ATLAS_AI_MULTILINGUAL_MODEL), [ATLAS_AI_MULTILINGUAL_MODEL]);
});

test("clean Kurdish answers still receive the dedicated final language pass", () => {
  const table = "| کات | ناوی نەخۆش | دۆخ |\n|---|---|---|\n| 09:30 | Ari | چاوەڕێ |";
  assert.equal(isAcceptableAtlasModelAnswer(table, "ku"), true);
  assert.equal(atlasAnswerNeedsKurdishRefinement(table, "ku"), true);
  assert.equal(atlasAnswerNeedsKurdishRefinement("ئەمڕۆ سێ مەوعید هەیە.", "ku"), true);
  assert.equal(atlasAnswerNeedsKurdishRefinement("ئەڤرۆ سێ مەوعید هەن.", "bd"), true);
});

test("Atlas rejects invented Appointments UI instructions without rejecting ordinary appointment wording", () => {
  assert.equal(isAcceptableAtlasModelAnswer("لە پەڕەی \"Appointments\" کلیک بکە.", "ku"), false);
  assert.equal(isAcceptableAtlasModelAnswer("Open the Appointments page and find the patient.", "en"), false);
  assert.equal(isAcceptableAtlasModelAnswer("You have 3 appointments today.", "en"), true);
  assert.equal(isAcceptableAtlasModelAnswer("ئەمڕۆ ٣ مەوعید هەیە.", "ku"), true);
});

test("Kurdish response quality gate rejects accidental English-only output", () => {
  assert.equal(isAcceptableAtlasModelAnswer("There are three appointments today.", "ku"), false);
  assert.equal(atlasAnswerNeedsKurdishRefinement("There are three appointments today.", "ku"), true);
});
