import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("clinic access feedback follows the active Atlas interface language", () => {
  const source = readFileSync(
    new URL("../app/dashboard/staff/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /const errorMessages: Record<UiLocale, Record<string, string>>/);
  assert.match(source, /const noticeMessages: Record<UiLocale, Record<string, string>>/);
  assert.match(source, /errorMessages\[locale\]\[params\.error\]/);
  assert.match(source, /noticeMessages\[locale\]\[params\.notice\]/);
  assert.match(source, /ku: \{/);
  assert.match(source, /bd: \{/);
  assert.match(source, /ar: \{/);
  assert.match(source, /بەڕێوەبردنی کلینیک گوازرایەوە/);
  assert.match(source, /تم نقل إدارة العيادة/);
});
