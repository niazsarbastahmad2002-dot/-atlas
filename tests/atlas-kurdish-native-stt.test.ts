import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  atlasKurdishSttConfig,
  atlasKurdishSttDialect,
  extractAtlasKurdishSttText,
} from "../lib/atlas-kurdish-stt.ts";

const route = fs.readFileSync(path.join(process.cwd(), "app/api/atlas-ai/transcribe/route.ts"), "utf8");
const helper = fs.readFileSync(path.join(process.cwd(), "lib/atlas-kurdish-stt.ts"), "utf8");

test("Kurdish-native STT maps Atlas Sorani and Badini to provider dialects", () => {
  assert.equal(atlasKurdishSttDialect("ku"), "sorani");
  assert.equal(atlasKurdishSttDialect("bd"), "kurmanji");
  assert.equal(atlasKurdishSttDialect("en"), null);
  assert.equal(atlasKurdishSttDialect("ar"), null);
});

test("Kurdish-native STT stays disabled until its server-side key is configured", () => {
  const previous = process.env.ATLAS_KURDISH_STT_API_KEY;
  delete process.env.ATLAS_KURDISH_STT_API_KEY;
  assert.equal(atlasKurdishSttConfig(), null);
  if (previous === undefined) delete process.env.ATLAS_KURDISH_STT_API_KEY;
  else process.env.ATLAS_KURDISH_STT_API_KEY = previous;
});

test("Kurdish-native STT accepts only HTTPS endpoints and cleans provider text", () => {
  const oldKey = process.env.ATLAS_KURDISH_STT_API_KEY;
  const oldEndpoint = process.env.ATLAS_KURDISH_STT_ENDPOINT;
  process.env.ATLAS_KURDISH_STT_API_KEY = "test-secret";
  process.env.ATLAS_KURDISH_STT_ENDPOINT = "http://unsafe.example.test/stt";
  assert.equal(atlasKurdishSttConfig(), null);
  process.env.ATLAS_KURDISH_STT_ENDPOINT = "https://example.test/stt";
  assert.deepEqual(atlasKurdishSttConfig(), { apiKey: "test-secret", endpoint: "https://example.test/stt" });
  assert.equal(extractAtlasKurdishSttText({ text: "  سڵاو   Atlas  " }), "سڵاو Atlas");
  assert.equal(extractAtlasKurdishSttText({ error: "x" }), "");
  if (oldKey === undefined) delete process.env.ATLAS_KURDISH_STT_API_KEY;
  else process.env.ATLAS_KURDISH_STT_API_KEY = oldKey;
  if (oldEndpoint === undefined) delete process.env.ATLAS_KURDISH_STT_ENDPOINT;
  else process.env.ATLAS_KURDISH_STT_ENDPOINT = oldEndpoint;
});

test("Kurdish provider credential remains server-side and native recognition runs before Cloudflare recovery", () => {
  assert.match(helper, /https:\/\/www\.kurdishtts\.com\/api\/stt-proxy/);
  assert.match(helper, /process\.env\.ATLAS_KURDISH_STT_API_KEY/);
  assert.match(helper, /headers: \{ "x-api-key": config\.apiKey \}/);
  assert.doesNotMatch(helper, /NEXT_PUBLIC_/);
  const nativeIndex = route.indexOf("transcribeWithAtlasKurdishStt(audio, locale)");
  const fallbackIndex = route.indexOf("const transcriptPasses = atlasKurdishAsrPasses(locale)");
  assert.ok(nativeIndex >= 0);
  assert.ok(fallbackIndex > nativeIndex);
  assert.match(route, /Badini, the source may be Kurmanji written in Latin script/);
});
