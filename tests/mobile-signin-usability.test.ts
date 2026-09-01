import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("temporary email rejects clearly invalid or non-mail domains before showing success", async () => {
  const route = await read("app/api/auth/temporary-email/route.ts");
  const login = await read("app/login/legacy/legacy-login-form.tsx");

  assert.match(route, /resolveMx/);
  assert.match(route, /domainCanReceiveMail/);
  assert.match(route, /invalid_email/);
  assert.match(route, /isPlausibleEmailAddress/);
  assert.match(login, /isPlausibleEmail/);
  assert.match(login, /result\?\.reason === "invalid_email"/);
  assert.match(login, /inputMode="email"/);
  assert.match(login, /autoCapitalize="none"/);
  assert.match(login, /autoCorrect="off"/);
  assert.match(login, /spellCheck=\{false\}/);
});

test("phone taps have obvious pressed and selected feedback across Atlas", async () => {
  const layout = await read("app/layout.tsx");
  const touch = await read("app/atlas-mobile-tap.css");

  assert.match(layout, /atlas-mobile-tap\.css/);
  assert.match(touch, /pointer: coarse/);
  assert.match(touch, /:active/);
  assert.match(touch, /transform: scale\(\.97\)/);
  assert.match(touch, /background: var\(--accent-hover\)/);
  assert.match(touch, /button\[aria-pressed="true"\]/);
  assert.match(touch, /a\[aria-current="page"\]/);
  assert.match(touch, /min-height: 48px/);
});

test("browser chrome follows Atlas appearance instead of forcing a dark theme", async () => {
  const layout = await read("app/layout.tsx");
  const manifest = await read("app/manifest.ts");
  const theme = await read("app/atlas-theme.css");

  assert.match(layout, /generateViewport/);
  assert.match(layout, /theme === "dark"/);
  assert.match(layout, /theme === "light"/);
  assert.match(layout, /#f4f7f5/);
  assert.match(layout, /#071b15/);
  assert.doesNotMatch(layout, /export const viewport/);
  assert.match(manifest, /theme_color: "#f4f7f5"/);
  assert.match(theme, /color-scheme: only light/);
});
