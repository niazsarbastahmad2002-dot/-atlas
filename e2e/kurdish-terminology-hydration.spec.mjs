import { expect, test } from "@playwright/test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

let fixture;
test.beforeAll(async ({}, worker) => {
  fixture = resolve(`app/dashboard/e2e-terminology-${worker.workerIndex}`);
  mkdirSync(fixture, { recursive: false });
  writeFileSync(resolve(fixture, "page.tsx"), `
    "use client";
    import { useEffect, useState } from "react";
    export default function TerminologyHydrationFixture() {
      const [hydrated, setHydrated] = useState(false);
      const [clicked, setClicked] = useState(false);
      useEffect(() => setHydrated(true), []);
      return <main className="terminology-hydration-fixture" data-hydrated={hydrated}>
        <h1>پزیشک</h1>
        <button type="button" onClick={() => setClicked(true)}>
          {clicked ? "وادەیەک" : "وادەکان"}
        </button>
      </main>;
    }
  `);
});
test.afterAll(() => { if (fixture) rmSync(fixture, { recursive: true, force: true }); });

for (const locale of ["ku", "bd"]) {
  test(`Kurdish React-owned doctor text remains stable after hydration and interaction (${locale})`, async ({ page, baseURL }, worker) => {
    expect(new URL(baseURL).hostname).toBe("127.0.0.1");
    await page.context().addCookies([{
      name: "atlas_ui_locale", value: locale,
      url: baseURL, sameSite: "Lax",
    }]);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(`/dashboard/e2e-terminology-${worker.workerIndex}`, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    const main = page.locator(".terminology-hydration-fixture");
    await expect(main).toHaveAttribute("data-hydrated", "true");
    await expect(main.locator("h1")).toHaveText("پزیشک");
    await expect(main.getByRole("button")).toHaveText("وادەکان");
    await main.getByRole("button").click();
    await expect(main.getByRole("button")).toHaveText("وادەیەک");
    // React effects and MutationObservers have had a chance to run.
    await page.waitForTimeout(150);
    await expect(main.locator("h1")).toHaveText("پزیشک");
    await expect(main.getByRole("button")).toHaveText("وادەیەک");
    expect(errors).toEqual([]);
  });
}
