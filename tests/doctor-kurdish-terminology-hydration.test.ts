import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../app/components/kurdish-secretary-terminology.tsx", import.meta.url),
  "utf8",
);

test("Kurdish terminology does not mutate React-owned doctor workspace during hydration", () => {
  const effect = source.indexOf("useEffect(() => {");
  const guard = source.indexOf('if (pathname.startsWith("/dashboard")) return;', effect);
  const firstDomRewrite = source.indexOf("normalizeSubtree(document.body, locale);", effect);
  assert.ok(effect >= 0 && guard > effect && firstDomRewrite > guard);
  assert.match(source, /const pathname = usePathname\(\);/);
  assert.match(source, /\}, \[locale, pathname\]\);/);
});

test("legacy terminology and text/attribute normalization outside Doctor remain intact", () => {
  assert.match(source, /applyClinicTerminology\(current, locale\)/);
  assert.match(source, /observer\.observe\(document\.body/);
  assert.match(source, /characterData: true/);
  assert.match(source, /attributeFilter: \[\.\.\.normalizedAttributes\]/);
});
