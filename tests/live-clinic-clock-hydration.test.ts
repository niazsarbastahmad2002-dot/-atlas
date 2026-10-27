import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { transformSync } from "next/dist/build/swc/index.js";
import * as ui from "../lib/i18n/ui.ts";
import * as format from "../lib/i18n/format.ts";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../app/dashboard/live-clinic-clock.tsx", import.meta.url), "utf8");
// styled-jsx normally removes this compiler-only attribute; only the clock's
// React markup is relevant to this server/first-client-render regression.
const compiled = transformSync(source.replace("<style jsx>", "<style>"), {
  filename: "live-clinic-clock.tsx",
  jsc: { parser: { syntax: "typescript", tsx: true }, transform: { react: { runtime: "automatic" } } },
  module: { type: "commonjs" },
}).code;

function firstRender(timestamp: string, locale: ui.UiLocale) {
  const instant = Date.parse(timestamp);
  class RenderDate extends Date {
    constructor(value?: string | number) { super(value ?? instant); }
    static now() { return instant; }
  }
  const module = { exports: {} as { LiveClinicClock: React.ComponentType<{ locale: ui.UiLocale }> } };
  runInNewContext(compiled, {
    module, exports: module.exports, Date: RenderDate,
    require: (name: string) => name === "@/lib/i18n/ui" ? ui
      : name === "@/lib/i18n/format" ? format : require(name),
  });
  return renderToStaticMarkup(createElement(module.exports.LiveClinicClock, { locale }));
}

for (const locale of ["en", "ku", "bd", "ar"] as const) {
  test(`clock first render survives delayed hydration across Baghdad midnight (${locale})`, () => {
    const server = firstRender("2026-10-26T20:59:59Z", locale);
    const delayedClient = firstRender("2026-10-26T21:00:02Z", locale);
    assert.equal(delayedClient, server, "Initial HTML must not depend on the server/client render time");
  });
}
