import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Apple mobile keeps safe inline dictation but blocks full-screen live voice", () => {
  const guard = source("app/components/atlas-apple-voice-safety.tsx");
  assert.match(guard, /iPad\|iPhone\|iPod/);
  assert.match(guard, /navigator\.platform === "MacIntel" && navigator\.maxTouchPoints > 1/);
  assert.match(guard, /atlasAppleVoicePaused/);
  assert.match(guard, /\.atlas-ai-live-button/);
  assert.doesNotMatch(guard, /\.atlas-ai-mic-button/);
  assert.doesNotMatch(guard, /\.atlas-ai-dictate-button/);
  assert.match(guard, /pointerdown/);
  assert.match(guard, /touchstart/);
  assert.match(guard, /click/);
  assert.match(guard, /preventDefault\(\)/);
  assert.match(guard, /stopImmediatePropagation\(\)/);
  assert.doesNotMatch(guard, /getUserMedia|MediaRecorder|AudioContext/);
});

test("Apple mobile keeps microphone and dictation UI visible while live voice stays hidden", () => {
  const css = source("app/atlas-apple-voice-safety.css");
  assert.match(css, /data-atlas-apple-voice-paused="true"/);
  assert.match(css, /\.atlas-ai-live-button/);
  assert.match(css, /display: none !important/);
  assert.match(css, /\.atlas-ai-mic-button/);
  assert.match(css, /\.atlas-ai-dictate-button/);
  assert.match(css, /visibility: visible !important/);
  assert.doesNotMatch(css, /data-atlas-apple-voice-paused="true"\] \.atlas-ai-mic-button[^}]*display:\s*none/is);
  assert.doesNotMatch(css, /\.atlas-ai-composer\s*\{[^}]*display:\s*none/i);
  assert.doesNotMatch(css, /\.atlas-ai-send-button\s*\{[^}]*display:\s*none/i);
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

test("Apple MediaRecorder stop is bounded so WebKit cannot wedge the page indefinitely", () => {
  const recorder = source("app/dashboard/assistant/atlas-pcm-recorder.ts");
  assert.match(recorder, /RECORDER_STOP_TIMEOUT_MS = 3_500/);
  assert.match(recorder, /window\.setTimeout/);
  assert.match(recorder, /settleStop\(fallback\)/);
  assert.match(recorder, /recorder\.stop\(\)/);
});

test("Apple voice safety is mounted globally and final readability CSS loads after it", () => {
  const layout = source("app/layout.tsx");
  assert.match(layout, /AtlasAppleVoiceSafety/);
  assert.match(layout, /<AtlasAppleVoiceSafety \/>/);
  const ipad = layout.indexOf('import "./atlas-ipad-summary-final.css";');
  const safety = layout.indexOf('import "./atlas-apple-voice-safety.css";');
  const finalReadability = layout.indexOf('import "./atlas-final-readability.css";');
  assert.ok(ipad >= 0);
  assert.ok(safety > ipad);
  assert.ok(finalReadability > safety);
});
