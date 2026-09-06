import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Apple mobile Atlas voice is paused before microphone entry can run", () => {
  const guard = source("app/components/atlas-apple-voice-safety.tsx");
  assert.match(guard, /iPad\|iPhone\|iPod/);
  assert.match(guard, /navigator\.platform === "MacIntel" && navigator\.maxTouchPoints > 1/);
  assert.match(guard, /atlasAppleVoicePaused/);
  assert.match(guard, /\.atlas-ai-mic-button/);
  assert.match(guard, /\.atlas-ai-dictate-button/);
  assert.match(guard, /\.atlas-ai-live-button/);
  assert.match(guard, /pointerdown/);
  assert.match(guard, /touchstart/);
  assert.match(guard, /click/);
  assert.match(guard, /preventDefault\(\)/);
  assert.match(guard, /stopImmediatePropagation\(\)/);
  assert.doesNotMatch(guard, /getUserMedia|MediaRecorder|AudioContext/);
});

test("Apple mobile voice UI is hidden while text Atlas AI remains available", () => {
  const css = source("app/atlas-apple-voice-safety.css");
  assert.match(css, /data-atlas-apple-voice-paused="true"/);
  assert.match(css, /\.atlas-ai-voice-tools/);
  assert.match(css, /\.atlas-ai-mic-button/);
  assert.match(css, /display: none !important/);
  assert.doesNotMatch(css, /\.atlas-ai-composer\s*\{[^}]*display:\s*none/i);
  assert.doesNotMatch(css, /\.atlas-ai-send-button\s*\{[^}]*display:\s*none/i);
});

test("Atlas microphone control has a durable circular geometry", () => {
  const css = source("app/atlas-apple-voice-safety.css");
  assert.match(css, /width: 38px !important/);
  assert.match(css, /height: 38px !important/);
  assert.match(css, /min-width: 38px !important/);
  assert.match(css, /min-height: 38px !important/);
  assert.match(css, /max-width: 38px !important/);
  assert.match(css, /max-height: 38px !important/);
  assert.match(css, /aspect-ratio: 1 \/ 1 !important/);
  assert.match(css, /border-radius: 50% !important/);
  assert.match(css, /padding: 0 !important/);
});

test("Apple voice safety is mounted globally and its CSS loads last", () => {
  const layout = source("app/layout.tsx");
  assert.match(layout, /AtlasAppleVoiceSafety/);
  assert.match(layout, /<AtlasAppleVoiceSafety \/>/);
  const ipad = layout.indexOf('import "\.\/atlas-ipad-summary-final\.css";'.replace(/\\/g, ""));
  const safety = layout.indexOf('import "./atlas-apple-voice-safety.css";');
  assert.ok(safety > ipad);
});
