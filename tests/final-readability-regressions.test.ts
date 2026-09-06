import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("appointment cards keep patient phone and appointment details easy to scan", () => {
  const css = source("app/atlas-final-readability.css");
  assert.match(css, /\.patient-cell bdi\[dir="ltr"\]/);
  assert.match(css, /letter-spacing: \.055em !important/);
  assert.match(css, /font-variant-numeric: tabular-nums !important/);
  assert.match(css, /\.polished-details \{/);
  assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\) !important/);
  assert.match(css, /\.appointment-time-value \{/);
  assert.match(css, /font-size: clamp\(16px, 1\.55vw, 19px\) !important/);
  assert.match(css, /word-spacing: \.16em !important/);
});

test("Atlas AI user bubbles and composer keep strong contrast in dark mode", () => {
  const css = source("app/atlas-final-readability.css");
  assert.match(css, /\.atlas-ai-message\.is-user \{/);
  assert.match(css, /color: #ffffff !important/);
  assert.match(css, /html\[data-theme="dark"\] body \.atlas-ai-composer/);
  assert.match(css, /background: #10261f !important/);
  assert.match(css, /\.atlas-ai-composer textarea::placeholder/);
  assert.match(css, /\.atlas-ai-mic-button/);
  assert.match(css, /display: grid !important/);
});

test("final readability layer is loaded after all other real-device CSS", () => {
  const layout = source("app/layout.tsx");
  const realDevice = layout.indexOf('import "./atlas-real-device-safety-final.css";');
  const finalReadability = layout.indexOf('import "./atlas-final-readability.css";');
  assert.ok(realDevice >= 0);
  assert.ok(finalReadability > realDevice);
});
