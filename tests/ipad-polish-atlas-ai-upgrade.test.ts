import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Settings icons stay standalone in dark and system-dark themes", () => {
  const css = source("app/atlas-dark-icon-polish.css");
  const darkBlock = css.match(/:root\[data-theme="dark"\] \.settings-card-icon \{([\s\S]*?)\}/)?.[1] ?? "";
  const systemBlock = css.match(/:root\[data-theme="system"\] \.settings-card-icon \{([\s\S]*?)\}/)?.[1] ?? "";

  for (const block of [darkBlock, systemBlock]) {
    assert.match(block, /background: transparent !important/);
    assert.match(block, /border: 0 !important/);
    assert.match(block, /box-shadow: none !important/);
    assert.doesNotMatch(block, /#173329|#355548/);
  }
});

test("active Schedule taps reset the same schedule to the top on topbar and bottom navigation", () => {
  const reset = source("app/dashboard/schedule-navigation-reset.tsx");
  const layout = source("app/dashboard/layout.tsx");
  assert.match(reset, /\.app-top-actions a, \.app-bottom-nav a, \.app-brand/);
  assert.match(reset, /destination\.search === window\.location\.search/);
  assert.match(reset, /window\.scrollTo\(\{ top: 0, behavior: "smooth" \}\)/);
  assert.match(reset, /event\.stopImmediatePropagation\(\)/);
  assert.doesNotMatch(reset, /setTimeout/);
  assert.match(layout, /<ScheduleNavigationReset \/>/);
});

test("Atlas AI production entry uses the React-owned stable core rather than the DOM-rewriting wrapper", () => {
  const active = source("app/dashboard/assistant/atlas-ai-client.tsx");
  const v5 = source("app/dashboard/assistant/atlas-ai-client-v5.tsx");
  assert.match(active, /atlas-ai-client-v4/);
  assert.doesNotMatch(active, /atlas-ai-client-v5/);
  assert.match(v5, /replaceChildren\(\)/);
  assert.match(v5, /requestSubmit\(\)/);
});

test("Atlas AI dormant table and responsive polish remain theme-safe", () => {
  const client = source("app/dashboard/assistant/atlas-ai-client-v5.tsx");
  assert.match(client, /background:var\(--surface\)/);
  assert.match(client, /background:var\(--surface-soft\)/);
  assert.match(client, /\[dir="rtl"\] \.atlas-ai-table\{direction:rtl\}/);
  assert.match(client, /@media\(min-width:721px\) and \(max-width:1400px\)/);
  assert.match(client, /@media\(max-width:720px\)/);
  assert.match(client, /touch-action:manipulation/);
  assert.doesNotMatch(client, /atlas-ai-table-wrap\{[^}]*background:#fff/);
});

test("Atlas AI page navigation and clinic controls follow the selected interface language", () => {
  const page = source("app/dashboard/assistant/page.tsx");
  assert.match(page, /uiText\(locale\)/);
  assert.match(page, /\{t\.backToSchedule\}/);
  assert.match(page, /\{t\.clinicWorkspace\}/);
  assert.match(page, /\{t\.switch\}/);
  assert.doesNotMatch(page, />← Schedule</);
});

test("Atlas AI core keeps synchronous duplicate-send protection and visible request states", () => {
  const core = source("app/dashboard/assistant/atlas-ai-client-v4.tsx");
  assert.match(core, /if\(nextQuestion\.length<2\|\|loadingRef\.current\) return null/);
  assert.match(core, /setLoadingValue\(true\)/);
  assert.match(core, /disabled=\{loading\|\|dictating\|\|transcribing\|\|starting\|\|question\.trim\(\)\.length<2\}/);
  assert.match(core, /is-thinking/);
  assert.match(core, /role="alert"/);
});
