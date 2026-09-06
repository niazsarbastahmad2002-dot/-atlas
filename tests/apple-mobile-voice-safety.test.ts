import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Apple mobile uses an isolated dictation path while full-screen live voice stays blocked", () => {
  const guard = source("app/components/atlas-apple-voice-safety.tsx");
  assert.match(guard, /iPad\|iPhone\|iPod/);
  assert.match(guard, /navigator\.platform === "MacIntel" && navigator\.maxTouchPoints > 1/);
  assert.match(guard, /LIVE_VOICE_SELECTOR = "\.atlas-ai-live-button"/);
  assert.match(guard, /DICTATION_SELECTOR = "\.atlas-ai-mic-button, \.atlas-ai-dictate-button"/);
  assert.match(guard, /event\.stopImmediatePropagation\(\)/);
  assert.match(guard, /document\.addEventListener\("click", handleClick, true\)/);
  assert.match(guard, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(guard, /new MediaRecorder/);
  assert.match(guard, /\/api\/atlas-ai\/transcribe/);
});

test("Apple dictation has bounded start, stop, and transcription operations", () => {
  const guard = source("app/components/atlas-apple-voice-safety.tsx");
  assert.match(guard, /START_TIMEOUT_MS = 7_000/);
  assert.match(guard, /STOP_TIMEOUT_MS = 3_500/);
  assert.match(guard, /TRANSCRIBE_TIMEOUT_MS = 22_000/);
  assert.match(guard, /Promise\.race\(\[request, timeout\]\)/);
  assert.match(guard, /new AbortController\(\)/);
  assert.match(guard, /controller\.abort\(\)/);
  assert.match(guard, /request\.then\(stopTracks\)/);
  assert.match(guard, /stopTracks\(stream\)/);
  assert.match(guard, /restore\(/);
});

test("Apple dictation inserts transcript through the React textarea input path", () => {
  const guard = source("app/components/atlas-apple-voice-safety.tsx");
  assert.match(guard, /HTMLTextAreaElement\.prototype/);
  assert.match(guard, /textarea\.dispatchEvent\(new Event\("input", \{ bubbles: true \}\)\)/);
  assert.match(guard, /textarea\.dispatchEvent\(new Event\("change", \{ bubbles: true \}\)\)/);
  assert.match(guard, /textarea\.focus\(\{ preventScroll: true \}\)/);
});

test("Apple mobile keeps microphone visible while hiding only unsafe live voice", () => {
  const css = source("app/atlas-apple-voice-safety.css");
  assert.match(css, /data-atlas-apple-voice-paused="true"/);
  assert.match(css, /\.atlas-ai-live-button/);
  assert.match(css, /display: none !important/);
  assert.match(css, /\.atlas-ai-mic-button/);
  assert.match(css, /\.atlas-ai-dictate-button/);
  assert.match(css, /visibility: visible !important/);
  assert.match(css, /data-atlas-apple-dictation-state="recording"/);
  assert.match(css, /atlas-ai-apple-dictation-status/);
  assert.doesNotMatch(css, /data-atlas-apple-voice-paused="true"\] \.atlas-ai-mic-button[\s\S]{0,180}display:\s*none/i);
});

test("Atlas microphone control has a durable circular geometry", () => {
  const css = source("app/atlas-apple-voice-safety.css");
  assert.match(css, /width: 42px !important/);
  assert.match(css, /height: 42px !important/);
  assert.match(css, /min-width: 42px !important/);
  assert.match(css, /min-height: 42px !important/);
  assert.match(css, /max-width: 42px !important/);
  assert.match(css, /max-height: 42px !important/);
  assert.match(css, /aspect-ratio: 1 \/ 1 !important/);
  assert.match(css, /border-radius: 50% !important/);
  assert.match(css, /padding: 0 !important/);
});

test("shared MediaRecorder stop is also bounded so WebKit cannot wedge indefinitely", () => {
  const recorder = source("app/dashboard/assistant/atlas-pcm-recorder.ts");
  assert.match(recorder, /RECORDER_STOP_TIMEOUT_MS = 3_500/);
  assert.match(recorder, /window\.setTimeout/);
  assert.match(recorder, /settleStop\(fallback\)/);
  assert.match(recorder, /recorder\.stop\(\)/);
});

test("Apple voice safety is mounted with locale and final readability CSS loads last", () => {
  const layout = source("app/layout.tsx");
  assert.match(layout, /<AtlasAppleVoiceSafety locale=\{locale\} \/>/);
  const ipad = layout.indexOf('import "./atlas-ipad-summary-final.css";');
  const safety = layout.indexOf('import "./atlas-apple-voice-safety.css";');
  const finalReadability = layout.indexOf('import "./atlas-final-readability.css";');
  assert.ok(ipad >= 0);
  assert.ok(safety > ipad);
  assert.ok(finalReadability > safety);
});
