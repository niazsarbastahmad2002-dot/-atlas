import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

// This route exists only while testing the local development server. It does
// not require clinic authentication, Supabase data, or a shipped fixture page.
let fixture;
test.beforeAll(async ({}, worker) => {
  fixture = resolve(`app/e2e-clock-${worker.workerIndex}`);
  mkdirSync(fixture, { recursive: false });
  writeFileSync(resolve(fixture, "page.tsx"), `
    import { LiveClinicClock } from "../dashboard/live-clinic-clock";
    export default async function Page({ searchParams }: {
      searchParams: Promise<{ locale?: string }>
    }) {
      const { locale } = await searchParams;
      const supported = locale === "ku" || locale === "bd" || locale === "ar" ? locale : "en";
      return <LiveClinicClock locale={supported} />;
    }
  `);
});
test.afterAll(() => { if (fixture) rmSync(fixture, { recursive: true }); });

for (const browserName of ["chromium", "webkit"]) {
test.describe(browserName, () => {
  test.use({ browserName });
for (const locale of ["en", "ku", "bd", "ar"]) {
  test(`clinic clock hydrates after delayed scripts and starts ticking (${locale})`, async ({ page, baseURL }, worker) => {
    expect(new URL(baseURL).hostname).toBe("127.0.0.1");
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    // Force the first browser render to happen in a later second than SSR.
    await page.route(/\/_next\/static\/.*\.js(?:\?|$)/, async route => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await route.continue();
    });
    const response = await page.goto(`/e2e-clock-${worker.workerIndex}?locale=${locale}`, { waitUntil: "commit" });
    expect(response?.status()).toBe(200);
    const html = await response.text();
    expect(html).toMatch(/class="[^"]*atlas-live-clock[^"]*"[^>]*aria-hidden="true"/);
    const clock = page.locator(".atlas-live-clock");
    await expect(clock).not.toHaveAttribute("aria-hidden", "true");
    const seconds = page.locator(".atlas-live-clock-seconds");
    await expect(seconds).not.toHaveText("--");
    const firstTick = await seconds.textContent();
    await expect(seconds).not.toHaveText(firstTick);
    expect(errors, "Delayed hydration must not produce browser errors").toEqual([]);
  });
}
});
}
