import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Atlas AI active client adds bounded voice recovery without replacing the stable V5/V4 core", () => {
  const active = read("app/dashboard/assistant/atlas-ai-client.tsx");
  const recovery = read("app/dashboard/assistant/atlas-ai-client-v6.tsx");
  assert.match(active, /atlas-ai-client-v6/);
  assert.match(recovery, /AtlasAiClientV5/);
  assert.match(recovery, /TRANSCRIBE_TIMEOUT_MS = 30_000/);
  assert.match(recovery, /VOICE_ANSWER_TIMEOUT_MS = 55_000/);
  assert.match(recovery, /new AbortController\(\)/);
  assert.match(recovery, /Atlas voice request timed out/);
  assert.match(recovery, /restoreFetch\(\)/);
});

test("failed live voice sessions close the blocking overlay and leave a localized visible error", () => {
  const recovery = read("app/dashboard/assistant/atlas-ai-client-v6.tsx");
  assert.match(recovery, /\.atlas-ai-live-overlay \.atlas-ai-live-error/);
  assert.match(recovery, /\.atlas-ai-live-overlay \.atlas-ai-live-topbar button/);
  assert.match(recovery, /endButton\.click\(\)/);
  assert.match(recovery, /queueMicrotask\(\(\) => showRecoveredVoiceError/);
  assert.match(recovery, /atlas-ai-voice-recovery-notice/);
  assert.match(recovery, /role", "alert"/);
});

test("composer microphone and send controls are structurally centered instead of nudged with a device pixel hack", () => {
  const recovery = read("app/dashboard/assistant/atlas-ai-client-v6.tsx");
  assert.match(recovery, /\.atlas-ai-composer-actions\{align-self:center!important;align-items:center!important;height:38px\}/);
  assert.match(recovery, /:is\(\.atlas-ai-mic-button,\.atlas-ai-send-button\)\{padding:0!important;line-height:0!important\}/);
  assert.match(recovery, /svg\{display:block;margin:auto\}/);
  assert.doesNotMatch(recovery, /translateY\(/);
});

test("iOS MediaRecorder capture uses real audio levels and a bounded stop path", () => {
  const recorder = read("app/dashboard/assistant/atlas-pcm-recorder.ts");
  assert.match(recorder, /RECORDER_STOP_TIMEOUT_MS = 3_000/);
  assert.match(recorder, /startMediaLevelMonitor/);
  assert.match(recorder, /createAnalyser\(\)/);
  assert.match(recorder, /getByteTimeDomainData/);
  assert.match(recorder, /Math\.sqrt\(sum \/ Math\.max\(1, samples\.length\)\)/);
  assert.match(recorder, /window\.setTimeout\(\(\) => \{/);
  assert.match(recorder, /recorderFailed = true/);
  assert.doesNotMatch(recorder, /onLevel\?\.\(0\.2\)/);
});

test("phone and iPad share six real appointment metrics while desktop remains outside the responsive enhancement", () => {
  const responsive = read("app/dashboard/responsive-dashboard-experience.tsx");
  const phoneCss = read("app/atlas-phone-six-summary.css");
  const layout = read("app/layout.tsx");
  assert.match(responsive, /matchMedia\("\(max-width: 1400px\)"\)/);
  for (const tone of ["total", "pending", "confirmed", "completed", "no-show", "cancelled"]) {
    assert.match(responsive, new RegExp(`upsertTabletStat\\(summary, "${tone}"`));
  }
  assert.match(phoneCss, /@media \(max-width: 699px\)/);
  assert.match(phoneCss, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(layout, /atlas-phone-six-summary\.css/);
});

test("repeated Settings taps return the current Settings page to the top just like Schedule", () => {
  const reset = read("app/dashboard/schedule-navigation-reset.tsx");
  assert.match(reset, /currentPath !== "\/dashboard" && currentPath !== "\/dashboard\/settings"/);
  assert.match(reset, /destination\.pathname !== currentPath/);
  assert.match(reset, /destination\.search !== window\.location\.search/);
  assert.match(reset, /currentPath === "\/dashboard" \? "schedule" : "settings"/);
  assert.match(reset, /window\.scrollTo\(\{ top: 0, behavior: "smooth" \}\)/);
  assert.doesNotMatch(reset, /setTimeout/);
});
