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

// The local CI runner installs Chromium; viewport coverage comes from the
// configured iPhone/Galaxy/iPad/desktop projects. Browser engines cannot be
// changed from inside test.describe (Playwright worker restriction).
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
    // React/Next may serialize aria-hidden before class. Check the clock's
    // own opening tag without assuming attribute order, while retaining the
    // pre-hydration accessibility assertion and post-hydration error gate.
    const clockStartTag = html.match(/<div\\b[^>]*class="[^"]*atlas-live-clock"[^>]*>/)?.[0];
    expect(clockStartTag, "Server HTML must contain the clinic clock").toBeDefined();
    expect(clockStartTag).toContain('aria-hidden="true"');
    const clock = page.locator(".atlas-live-clock");
    await expect(clock).not.toHaveAttribute("aria-hidden", "true");
    const seconds = page.locator(".atlas-live-clock-seconds");
    await expect(seconds).not.toHaveText("--");
    const firstTick = await seconds.textContent();
    await expect(seconds).not.toHaveText(firstTick);
    expect(errors, "Delayed hydration must not produce browser errors").toEqual([]);
  });
}
