import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/history/page.tsx", import.meta.url), "utf8");

test("appointment history load failures return to settings for the same clinic", () => {
  assert.match(
    source,
    /appointmentsError[\s\S]*href=\{\`\/dashboard\/settings\?\$\{new URLSearchParams\(\{ clinic: clinic\.id \}\)\}\`\}/,
  );
});
