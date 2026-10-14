import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const patientLanguage = readFileSync(new URL("../app/care/patient-language-switcher.tsx", import.meta.url), "utf8");

test("welcome has exactly two prominent, correctly routed choices", () => {
  const main = home.slice(home.indexOf('<section className="atlas-welcome-main"'), home.indexOf("</section>") + 10);
  assert.match(main, /href="\/care"/);
  assert.match(main, /href="\/dashboard"/);
  assert.equal((main.match(/className="button(?: button-ghost)? atlas-mode-button/g) ?? []).length, 2);
  assert.doesNotMatch(main, /href="\/demo"|href="\/patient-account"|href="\/atlas-local.html"/);
  assert.match(home, /patientTitle: "Find Care"/);
  assert.match(home, /professionalTitle: "Run a Clinic or Center"/);
});

test("language choice stays accessible and retains all four existing locales", () => {
  assert.match(home, /<PatientLanguageSwitcher locale=\{locale\} \/>/);
  assert.match(home, /getUiLocale\(\)/);
  for (const locale of ["en", "ku", "bd", "ar"]) {
    assert.match(home, new RegExp("\\b" + locale + ": \\{"));
    assert.match(patientLanguage, new RegExp("\\b" + locale + ': "'));
  }
  assert.match(patientLanguage, /aria-label=\{label\[locale\]\}/);
  assert.match(home, /html\[dir="rtl"\]/);
});

test("secondary links live below the main decision and privacy boundaries remain intact", () => {
  assert.ok(home.indexOf('<aside className="shell atlas-welcome-aux"') > home.indexOf("</section>"));
  for (const href of ["/patient-account", "/demo", "/atlas-local.html", "/support", "/privacy", "/terms"]) {
    assert.ok(home.includes('href="' + href + '"'), "Missing secondary route " + href);
  }
  assert.match(home, /if \(data\.user\) redirect\("\/dashboard"\)/);
  assert.match(home, /Patient discovery is public\. Clinic work stays private\./);
  assert.doesNotMatch(home, /\.from\(["']appointments["']\)|service_role|patient_phone|insert\(/);
});

test("welcome styles support small screens, keyboard focus, reduced motion and dark mode", () => {
  assert.match(home, /@media\(max-width:720px\)/);
  assert.match(home, /@media\(max-width:400px\)/);
  assert.match(home, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(home, /focus-visible/);
  assert.match(home, /data-theme=\\"dark\\"/);
});
