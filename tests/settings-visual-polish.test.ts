import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layoutPath = new URL("../app/layout.tsx", import.meta.url);
const finishCssPath = new URL("../app/atlas-settings-finish.css", import.meta.url);
const darkIconCssPath = new URL("../app/atlas-dark-icon-polish.css", import.meta.url);
const phoneManagerPath = new URL("../app/dashboard/settings/phone-number-manager.tsx", import.meta.url);

test("Kurdish UI uses the dedicated Arabic-script font", async () => {
  const [layout, css] = await Promise.all([
    readFile(layoutPath, "utf8"),
    readFile(finishCssPath, "utf8"),
  ]);

  assert.match(layout, /Noto_Sans_Arabic/);
  assert.match(layout, /--font-atlas-kurdish/);
  assert.match(layout, /atlas-settings-finish\.css/);
  assert.match(css, /html\[lang="ckb"\] body/);
  assert.match(css, /html\[lang="ku"\] body/);
  assert.match(css, /letter-spacing:\s*0\s*!important/);
});

test("account settings nested controls have distinct spacing and boundaries", async () => {
  const css = await readFile(finishCssPath, "utf8");

  assert.match(css, /\.settings-card:has\(\.account-email\) > \.settings-form/);
  assert.match(css, /margin-top:\s*12px/);
  assert.match(css, /border:\s*1px solid var\(--line\)/);
  assert.match(css, /\.settings-card:has\(\.account-email\) > \.settings-disclosure/);
});

test("Settings cards share one restrained Atlas mint glow in light and dark modes", async () => {
  const css = await readFile(finishCssPath, "utf8");

  assert.match(css, /\.settings-card,\s*\n\.settings-card-accent\s*\{/);
  assert.match(css, /radial-gradient\(circle at 100% 0/);
  assert.match(css, /:root\[data-theme="dark"\] \.settings-card/);
  assert.match(css, /:root\[data-theme="system"\] \.settings-card/);
  assert.match(css, /border-color:\s*var\(--line\)\s*!important/);
});

test("dark mode keeps Settings icons standalone while preserving the Atlas AI identity orb", async () => {
  const [layout, css] = await Promise.all([
    readFile(layoutPath, "utf8"),
    readFile(darkIconCssPath, "utf8"),
  ]);

  assert.match(layout, /atlas-dark-icon-polish\.css/);
  assert.match(css, /:root\[data-theme="dark"\] \.settings-card-icon/);
  assert.match(css, /background:\s*transparent\s*!important/);
  assert.match(css, /border:\s*0\s*!important/);
  assert.match(css, /box-shadow:\s*none\s*!important/);
  assert.match(css, /:root\[data-theme="dark"\] \.atlas-ai-orb/);
  assert.match(css, /#10271f/);
  assert.match(css, /:root\[data-theme="system"\] \.settings-card-icon/);
});

test("pending Kurdish phone text is not forced into left-to-right English rendering", async () => {
  const manager = await readFile(phoneManagerPath, "utf8");

  assert.match(manager, /currentPhone\s*\?\s*\(/);
  assert.match(manager, /className="atlas-phone-display" dir="ltr" lang="en"/);
  assert.match(manager, /<strong>\{copy\.pending\}<\/strong>/);
  assert.doesNotMatch(manager, /\{currentPhone \? formatPhoneForDisplay\(currentPhone\) : copy\.pending\}/);
});
