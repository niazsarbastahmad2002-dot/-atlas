import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { applyClinicTerminology } from "../lib/i18n/terminology.ts";

const source = readFileSync(new URL("../app/components/kurdish-secretary-terminology.tsx", import.meta.url), "utf8");

test("global terminology never rewrites server-localized schedule or staff before hydration", () => {
  const effect = source.slice(source.indexOf("export function KurdishSecretaryTerminology"));
  const pathCheck = effect.indexOf('if (pathname === "/dashboard" || pathname === "/dashboard/staff") return;');
  const rewrite = effect.indexOf("normalizeSubtree(document.body, locale)");
  const observe = effect.indexOf("new MutationObserver(");
  assert.ok(pathCheck >= 0 && rewrite > pathCheck && observe > pathCheck);
  assert.match(effect, /const pathname = usePathname\(\);/);
  assert.match(effect, /\}, \[locale, pathname\]\);/, "navigation must reconfigure the legacy effect");
});

test("Sorani text conversion reproduces the actual pre-hydration mismatch", () => {
  assert.equal(applyClinicTerminology("خشتەی وادەکان", "ku"), "خشتەی مەوعیدەکان");
  assert.equal(applyClinicTerminology("خشتەی وادەکان", "en"), "خشتەی وادەکان");
});

test("other pages retain Kurdish terminology and accessible attribute normalization", () => {
  assert.match(source, /applyClinicTerminology\(current, locale\)/);
  assert.match(source, /attributeFilter: \[\.\.\.normalizedAttributes\]/);
  assert.match(source, /mutation\.addedNodes\.forEach/);
});
