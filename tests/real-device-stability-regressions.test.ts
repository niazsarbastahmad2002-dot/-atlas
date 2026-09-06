import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Atlas AI production entry avoids the DOM-rewriting V5 wrapper", () => {
  const entry = source("app/dashboard/assistant/atlas-ai-client.tsx");
  const v5 = source("app/dashboard/assistant/atlas-ai-client-v5.tsx");

  assert.match(entry, /export \{ AtlasAiClient \} from "\.\/atlas-ai-client-v4"/);
  assert.doesNotMatch(entry, /export \{ AtlasAiClient \} from "\.\/atlas-ai-client-v5"/);
  assert.match(v5, /replaceChildren\(\)/);
  assert.match(v5, /requestSubmit\(\)/);
});

test("final dark-mode guard keeps appointment feedback readable", () => {
  const layout = source("app/layout.tsx");
  const css = source("app/atlas-real-device-safety-final.css");
  const appleSafety = layout.indexOf('import "./atlas-apple-voice-safety.css";');
  const finalSafety = layout.indexOf('import "./atlas-real-device-safety-final.css";');

  assert.ok(appleSafety >= 0);
  assert.ok(finalSafety > appleSafety);
  assert.match(css, /data-theme="dark"/);
  assert.match(css, /data-theme="system"/);
  assert.match(css, /\.atlas-fast-save-toast/);
  assert.match(css, /\.atlas-fast-save-toast\.is-error/);
  assert.match(css, /\.atlas-fast-save-toast\.is-success/);
  assert.match(css, /\.workspace-notice/);
  assert.match(css, /\.settings-page/);
});

test("appointment phone-number tokens are forced to LTR in RTL interfaces", () => {
  const dashboard = source("app/dashboard/page.tsx");
  const css = source("app/atlas-real-device-safety-final.css");

  assert.match(dashboard, /<bdi dir="ltr">\{formatIraqiMobile\(appointment\.patient_phone\)\}<\/bdi>/);
  assert.match(css, /bdi\[dir="ltr"\]/);
  assert.match(css, /direction:\s*ltr !important/);
  assert.match(css, /unicode-bidi:\s*isolate !important/);
  assert.match(css, /white-space:\s*nowrap/);
});
