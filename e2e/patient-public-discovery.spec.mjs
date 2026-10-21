import { expect, test } from "@playwright/test";

const locales = ["en", "ku", "bd", "ar"];

test("public Welcome preserves care and existing Doctor entry and fits viewport", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#atlas-welcome-title")).toBeVisible();
  await expect(page.locator('a.atlas-patient-entry[href="/care?lang=en"]')).toBeVisible();
  await expect(page.locator('a.atlas-professional-entry[href="/dashboard"]')).toBeVisible();
  const size = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(size.scroll).toBeLessThanOrEqual(size.client + 1);
});

test("Find Care works in all four languages; complaint flow is absent", async ({ page }) => {
  test.setTimeout(100_000);
  for (const locale of locales) {
    await page.goto("/care?lang=" + locale);
    await expect(page.locator("main.atlas-care-page")).toHaveAttribute("dir", locale === "en" ? "ltr" : "rtl");
    await expect(page.locator("#atlas-care-direct-search")).toBeVisible();
    await expect(page.locator("#atlas-care-guided-title")).toBeVisible();
    await expect(page.locator('a[href*="/care/complaints"]')).toHaveCount(0);
    await expect(page.locator('a[href*="/explore/specialties"]').first()).toBeVisible();
    const state = await page.evaluate(() => ({
      flex: getComputedStyle(document.querySelector(".atlas-care-journey")).flexDirection,
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    if (page.viewportSize().width <= 700) expect(state.flex).toBe("column");
    expect(state.scroll).toBeLessThanOrEqual(state.client + 1);
  }
});

test("Explore clinics, specialties and locations render correctly in all four languages", async ({ page }) => {
  test.setTimeout(180_000);
  for (const locale of locales) {
    for (const kind of ["clinics", "specialties", "locations"]) {
      await page.goto("/explore/" + kind + "?lang=" + locale);
      await expect(page.locator("main.atlas-patient-explore")).toHaveAttribute("dir", locale === "en" ? "ltr" : "rtl");
      await expect(page.locator(".atlas-explore-header h1")).toBeVisible();
      await expect(page.locator(".atlas-explore-tabs a")).toHaveCount(3);
      await expect(page.locator('a[href*="/care/complaints"]')).toHaveCount(0);
      const size = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(size.scroll).toBeLessThanOrEqual(size.client + 1);
    }
  }
});

test("Welcome roundtrip preserves all four explicit languages", async ({ page }) => {
  for (const locale of locales) {
    await page.goto("/care?lang=" + locale);
    await page.locator("a.atlas-care-back").click();
    await expect(page).toHaveURL(new RegExp("/\\?lang=" + locale + "$"));
    await expect(page.locator("#atlas-welcome-title")).toBeVisible();
    await expect(page.locator('a.atlas-patient-entry')).toHaveAttribute("href", "/care?lang=" + locale);
    await expect(page.locator('a[href^="/patient-account?lang="]')).toHaveAttribute("href", "/patient-account?lang=" + locale);
    await page.locator("a.atlas-patient-entry").click();
    await expect(page.locator("main.atlas-care-page")).toHaveAttribute("dir", locale === "en" ? "ltr" : "rtl");
    await expect(page).toHaveURL(new RegExp("/care\\?lang=" + locale + "$"));
  }
});
