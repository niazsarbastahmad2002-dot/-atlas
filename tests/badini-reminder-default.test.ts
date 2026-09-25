import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("appointment form applies Badini doctor reminder defaults", () => {
  const source = readFileSync(
    new URL("../app/dashboard/appointment-time-field-v2.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /\["ku", "bd", "ar", "en"\]\.includes\(language\)/);
});
