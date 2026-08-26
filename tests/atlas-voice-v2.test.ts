import assert from "node:assert/strict";
import test from "node:test";
import {
  atlasKurdishAsrPasses,
  checkAtlasVoiceUpload,
  cleanAtlasVoiceTranscript,
  isPlausibleAtlasVoiceTranscript,
  normalizeAtlasVoiceMediaType,
  parseAtlasKurdishReconciliation,
} from "../lib/atlas-voice.ts";

test("normalizes Safari audio MIME variants instead of rejecting valid recordings", () => {
  assert.equal(normalizeAtlasVoiceMediaType("audio/mp4; codecs=mp4a.40.2", "voice.m4a"), "audio/mp4");
  assert.equal(normalizeAtlasVoiceMediaType("video/mp4; codecs=mp4a.40.2", "voice.m4a"), "audio/mp4");
  assert.equal(normalizeAtlasVoiceMediaType("", "voice.m4a"), "audio/mp4");
  assert.equal(normalizeAtlasVoiceMediaType("audio/webm;codecs=opus", "voice.webm"), "audio/webm");
});

test("voice upload validation distinguishes empty, oversized, and unsupported recordings", () => {
  assert.deepEqual(checkAtlasVoiceUpload({ size: 12, type: "audio/wav", name: "voice.wav" }), { ok: false, reason: "empty" });
  assert.deepEqual(checkAtlasVoiceUpload({ size: 6 * 1024 * 1024 + 1, type: "audio/wav", name: "voice.wav" }), { ok: false, reason: "too_large" });
  assert.deepEqual(checkAtlasVoiceUpload({ size: 20_000, type: "application/octet-stream", name: "voice.bin" }), { ok: false, reason: "unsupported_type" });
  assert.deepEqual(checkAtlasVoiceUpload({ size: 20_000, type: "audio/wav", name: "voice.wav" }), { ok: true, mediaType: "audio/wav" });
});

test("Kurdish transcription uses diverse ASR hints rather than one fragile guess", () => {
  assert.deepEqual(atlasKurdishAsrPasses("ku"), [
    { label: "auto" },
    { label: "persian_hint", language: "fa" },
    { label: "arabic_hint", language: "ar" },
  ]);
  assert.deepEqual(atlasKurdishAsrPasses("bd"), [
    { label: "auto" },
    { label: "turkish_hint", language: "tr" },
    { label: "persian_hint", language: "fa" },
  ]);
});

test("voice transcript plausibility rejects obvious wrong-script and corrupted output", () => {
  assert.equal(isPlausibleAtlasVoiceTranscript("Hello, how busy is the clinic today?", "en"), true);
  assert.equal(isPlausibleAtlasVoiceTranscript("ئەمڕۆ کلینیک چەند قەرەباڵغە؟", "ku"), true);
  assert.equal(isPlausibleAtlasVoiceTranscript("ئەڤرۆ کلینیک چەند قەرەبالغە؟", "bd"), true);
  assert.equal(isPlausibleAtlasVoiceTranscript("شلون زحمة العيادة اليوم؟", "ar"), true);
  assert.equal(isPlausibleAtlasVoiceTranscript("random latin garbage only", "ku"), false);
  assert.equal(isPlausibleAtlasVoiceTranscript("��������", "ku"), false);
});

test("Kurdish reconciliation accepts structured confidence and refuses malformed output", () => {
  assert.deepEqual(
    parseAtlasKurdishReconciliation('{"text":"ئەمڕۆ کلینیک چەند قەرەباڵغە؟","confidence":"high"}'),
    { text: "ئەمڕۆ کلینیک چەند قەرەباڵغە؟", confidence: "high" },
  );
  assert.equal(parseAtlasKurdishReconciliation("not json"), null);
  assert.equal(parseAtlasKurdishReconciliation('{"text":"x","confidence":"unknown"}'), null);
});

test("transcript cleanup removes model fencing and normalizes whitespace", () => {
  assert.equal(cleanAtlasVoiceTranscript('```text\n  سڵاو   Atlas  \n```'), "سڵاو Atlas");
});
