import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("clinic timing updates compare against the timing revision the receptionist saw", () => {
  const route = read("app/api/clinic-live-flow/route.ts");
  const ui = read("app/dashboard/live-clinic-flow.tsx");

  assert.match(route, /expectedUpdatedAt/);
  assert.match(route, /\.eq\("updated_at", expectedUpdatedAt\)/);
  assert.match(route, /error\.code !== "23505"/);
  assert.match(route, /current && current\.delay_minutes === delayMinutes/);
  assert.match(route, /error: "stale"/);
  assert.match(route, /status: 409/);

  assert.match(ui, /expectedUpdatedAt: flow\.timingUpdatedAt \?\? null/);
  assert.match(ui, /response\.status === 409 && saved\.error === "stale"/);
  assert.match(ui, /timingUpdatedAt: saved\.timingUpdatedAt \?\? current\.timingUpdatedAt/);
});

test("stale clinic timing feedback is localized instead of silently overwriting another device", () => {
  const ui = read("app/dashboard/live-clinic-flow.tsx");

  assert.match(ui, /Clinic timing changed on another device\. Latest timing loaded\./);
  assert.match(ui, /کاتی کلینیک لە ئامێرێکی تر گۆڕدرا/);
  assert.match(ui, /دەمێ کلینیکێ ل ئامێرەکێ دی هاتیە گۆڕین/);
  assert.match(ui, /توقيت العيادة اتغيّر من جهاز ثاني/);
});


test("live clinic timing load failures are visible and retryable in every Atlas language", () => {
  const ui = read("app/dashboard/live-clinic-flow.tsx");

  assert.match(ui, /Clinic timing could not be loaded\./);
  assert.match(ui, /کاتی کلینیک بار نەکرا/);
  assert.match(ui, /دەمێ کلینیکێ نەهاتە بارکرن/);
  assert.match(ui, /ما كدرنا نحمّل وقت العيادة/);
  assert.match(ui, /if \(!response\.ok\) throw new Error\("load_failed"\)/);
  assert.match(ui, /setLoadFailed\(true\)/);
  assert.match(ui, /setLoadFailed\(false\)/);
  assert.match(ui, /onClick=\{\(\) => void load\(\)\}/);
  assert.match(ui, />\{t\.retry\}<\/button>/);
});
