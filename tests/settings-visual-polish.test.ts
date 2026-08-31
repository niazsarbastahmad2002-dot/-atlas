import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layoutPath = new URL("../app/layout.tsx", import.meta.url);
const finishCssPath = new URL("../app/atlas-settings-finish.css", import.meta.url);

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
