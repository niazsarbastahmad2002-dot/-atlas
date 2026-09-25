import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Atlas AI inside-composer microphone uses guarded real-device capture with cleanup", () => {
  const client = source("app/dashboard/assistant/atlas-ai-client-v5.tsx");

  assert.match(client, /atlasPcmCaptureSupported/);
  assert.match(client, /startAtlasPcmCapture/);
  assert.match(client, /\.atlas-ai-mic-button, \.atlas-ai-dictate-button/);
  assert.match(client, /event\.stopImmediatePropagation\(\)/);
  assert.match(client, /getUserMedia/);
  assert.match(client, /withTimeout\(mediaPromise, 12_000, "voice_timeout"\)/);
  assert.match(client, /withTimeout\(capturePromise, 8_000, "voice_timeout"\)/);
  assert.match(client, /withTimeout\(activeCapture\.stop\(\), 8_000, "voice_timeout"\)/);
  assert.match(client, /abortController\?\.abort\(\)/);
  assert.match(client, /stopTracks\(stream\)/);
  assert.match(client, /activeCapture\.discard\(\)/);
  assert.match(client, /setState\("idle"\)/);
});

test("Atlas AI preserves the actual recording media type when sending audio", () => {
  const client = source("app/dashboard/assistant/atlas-ai-client-v5.tsx");
  assert.match(client, /const type = blob\.type \|\| "audio\/wav"/);
  assert.match(client, /new File\(\[blob\], filenameForVoice\(type\), \{ type \}\)/);
  assert.match(client, /atlas-voice\.m4a/);
  assert.match(client, /atlas-voice\.webm/);
  assert.doesNotMatch(client, /new File\(\[blob\],"atlas-voice\.wav",\{type:"audio\/wav"\}\)/);
});

test("Atlas AI live voice cannot leave a permanent blocking overlay after failure or startup hang", () => {
  const client = source("app/dashboard/assistant/atlas-ai-client-v5.tsx");
  assert.match(client, /recoverLiveFailure/);
  assert.match(client, /\.atlas-ai-live-error/);
  assert.match(client, /atlasRecoveryClosing/);
  assert.match(client, /\.atlas-ai-live-topbar button/);
  assert.match(client, /12_000/);
  assert.match(client, /showError\(t\.busy\)/);
});

test("Atlas AI composer actions keep the microphone centered on phone and iPad", () => {
  const client = source("app/dashboard/assistant/atlas-ai-client-v5.tsx");
  assert.match(client, /\.atlas-ai-composer-actions\{align-self:center;align-items:center;justify-content:center\}/);
  assert.match(client, /:is\(\.atlas-ai-mic-button,\.atlas-ai-send-button\)\{align-self:center;display:grid;place-items:center;padding:0;margin:0;line-height:1\}/);
  assert.match(client, /:is\(\.atlas-ai-mic-button,\.atlas-ai-send-button\) svg\{display:block;margin:0\}/);
});

test("phone schedule exposes the same six real appointment metrics in a compact 2x3 grid", () => {
  const experience = source("app/dashboard/responsive-dashboard-experience.tsx");
  const css = source("app/atlas-ipad-summary-final.css");

  const dashboard = source("app/dashboard/page.tsx");
  assert.match(experience, /atlas-phone-six-stats/);
  assert.doesNotMatch(experience, /upsertTabletStat/);
  assert.match(dashboard, /tone="total"/);
  assert.match(dashboard, /tone="pending"/);
  assert.match(dashboard, /tone="confirmed"/);
  assert.match(dashboard, /tone="completed"/);
  assert.match(dashboard, /tone="no-show"/);
  assert.match(dashboard, /tone="cancelled"/);
  assert.match(css, /@media \(max-width: 699px\)/);
  assert.match(css, /\.schedule-summary\.atlas-phone-six-stats/);
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /min-height: 72px/);
  assert.match(css, /:root\[data-theme="dark"\][\s\S]*atlas-phone-six-stats/);
});

test("active Settings and Schedule taps both return their current page to the top", () => {
  const reset = source("app/dashboard/schedule-navigation-reset.tsx");
  assert.match(reset, /currentPath !== "\/dashboard" && currentPath !== "\/dashboard\/settings"/);
  assert.match(reset, /destination\.pathname !== "\/dashboard" && destination\.pathname !== "\/dashboard\/settings"/);
  assert.match(reset, /destination\.search === window\.location\.search/);
  assert.match(reset, /window\.scrollTo\(\{ top: 0, behavior: "smooth" \}\)/);
  assert.match(reset, /event\.stopImmediatePropagation\(\)/);
  assert.doesNotMatch(reset, /setTimeout/);
});
