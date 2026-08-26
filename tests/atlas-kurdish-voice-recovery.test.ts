import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const route = fs.readFileSync(path.join(process.cwd(), "app/api/atlas-ai/transcribe/route.ts"), "utf8");

test("Kurdish voice combines phonetic transcription with same-audio semantic translation evidence", () => {
  assert.match(route, /type SpeechTask = "transcribe" \| "translate"/);
  assert.match(route, /task: SpeechTask/);
  assert.match(route, /speechPass\(audioBase64, locale, config, "transcribe"/);
  assert.match(route, /speechPass\(audioBase64, locale, config, "translate"/);
  assert.match(route, /ENGLISH MEANING GUESSES FROM THE SAME AUDIO/);
  assert.match(route, /semantic evidence from the same audio/i);
  assert.match(route, /exact Kurdish spelling had to be normalized/i);
});

test("Kurdish recovery tolerates low-resource Whisper confidence without exposing raw provider diagnostics", () => {
  assert.match(route, /no_speech_threshold: 0\.78/);
  assert.match(route, /log_prob_threshold: -1\.5/);
  assert.match(route, /condition_on_previous_text: false/);
  assert.match(route, /beam_size: 5/);
  assert.doesNotMatch(route, /provider_response|diagnostic_response|raw_provider/i);
  assert.doesNotMatch(route, /console\./);
});

test("Kurdish voice still fails closed when evidence is genuinely unreliable", () => {
  assert.match(route, /parsed\.confidence === "low"/);
  assert.match(route, /isPlausibleAtlasVoiceTranscript\(parsed\.text, locale\)/);
  assert.match(route, /error.*unclear_speech/s);
  assert.match(route, /Cache-Control.*no-store, private/s);
});
