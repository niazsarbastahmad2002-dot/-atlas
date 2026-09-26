import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("receptionist invite sharing falls back safely when native share or clipboard fails", () => {
  const source = readFileSync(
    new URL("../app/dashboard/staff/invite-link-form.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /const \[shareError, setShareError\] = useState\(""/);
  assert.match(source, /await navigator\.clipboard\.writeText\(state\.url\)/);
  assert.match(source, /setShareError\(t\.copyFailed\)/);
  assert.match(source, /error instanceof DOMException && error\.name === "AbortError"/);
  assert.match(source, /await copyLink\(\)/);
  assert.match(source, /role="alert"/);
  assert.match(source, /بەستەرەکە کۆپی نەکرا/);
  assert.match(source, /تعذر نسخ الرابط/);
});
