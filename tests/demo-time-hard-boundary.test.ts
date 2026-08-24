import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("sample clinic hard-bounds the native time input on WebKit/iPad", async () => {
  const [page, demo] = await Promise.all([
    read("app/demo/page.tsx"),
    read("app/demo/demo-modern.tsx"),
  ]);

  assert.match(demo, /className="demo-modern-time-input"/);
  assert.match(page, /box-sizing: border-box !important/);
  assert.match(page, /width: 100% !important/);
  assert.match(page, /inline-size: 100% !important/);
  assert.match(page, /max-inline-size: 100% !important/);
  assert.match(page, /-webkit-appearance: none/);
  assert.match(page, /::-webkit-date-and-time-value/);
});
