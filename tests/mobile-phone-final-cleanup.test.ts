import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("phone schedule stretches across the available width instead of leaving an RTL gutter", () => {
  const css = source("app/atlas-phone-final.css");
  assert.match(css, /\.workspace-grid[\s\S]*align-items: stretch !important/);
  assert.match(css, /\.workspace-grid > \.appointments-panel[\s\S]*width: 100% !important/);
  assert.match(css, /\.workspace-grid > \.appointment-composer[\s\S]*align-self: stretch !important/);
});

test("phone settings use deliberate SVG icon badges rather than exposed Unicode tiles", () => {
  const css = source("app/atlas-phone-final.css");
  assert.match(css, /\.settings-card-icon[\s\S]*border-radius: 50% !important/);
  assert.match(css, /font-size: 0 !important/);
  assert.match(css, /settings-card-accent \.settings-card-icon::before/);
  assert.match(css, /settings-card:has\(#clinic_name\) \.settings-card-icon::before/);
  assert.match(css, /atlas-workflow-card \.settings-card-icon::before/);
  assert.match(css, /settings-card-wide:not\(\.atlas-workflow-card\) \.settings-card-icon::before/);
  assert.match(css, /settings-link-card \.settings-card-icon::before/);
  assert.match(css, /settings-card:has\(\.account-email\) \.settings-card-icon::before/);
  assert.ok((css.match(/data:image\/svg\+xml/g) ?? []).length >= 6);
});

test("mobile selected and pressed states stay readable instead of bleaching white", () => {
  const css = source("app/atlas-phone-final.css");
  assert.match(css, /--atlas-phone-selected-bg: #176148/);
  assert.match(css, /--atlas-phone-selected-ink: #f7fffb/);
  assert.match(css, /app-bottom-nav > a:not\(\.app-bottom-add\)\.is-active[\s\S]*background: var\(--atlas-phone-selected-bg\) !important/);
  assert.match(css, /settings-page :is\(button, summary, a\.settings-link\):active[\s\S]*background: var\(--atlas-phone-press-bg\) !important/);
  assert.match(css, /atlas-period-tabs button\.is-selected[\s\S]*background: var\(--atlas-phone-selected-bg\) !important/);
});

test("final phone cleanup stylesheet is loaded after the earlier phone layers", () => {
  const layout = source("app/layout.tsx");
  const phone = layout.indexOf('import "./atlas-phone.css";');
  const final = layout.indexOf('import "./atlas-phone-final.css";');
  assert.ok(phone >= 0);
  assert.ok(final > phone);
});
