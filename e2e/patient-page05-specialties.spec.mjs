import { expect, test } from "@playwright/test";

const locales = ["en", "ku", "bd", "ar"];

test("Page 05 supports four languages, comparison, recovery and small-screen layout", async ({ page }) => {
  for (const locale of locales) {
    await page.goto(`/care/complaints?lang=${locale}`);
    await expect(page.locator(".atlas-complaint-page")).toHaveAttribute("dir", locale === "en" ? "ltr" : "rtl");
    await page.locator(".atlas-complaint-choice").first().click(); // synthetic catalog's headache
    await expect(page).toHaveURL(/\/care\/complaints\/questions/);
    await page.locator(".atlas-complaint-answers button").nth(1).click(); // "No" to the draft safety question
    await page.locator(".atlas-complaint-next button").click();
    await expect(page).toHaveURL(/\/care\/complaints\/specialties/);
    await expect(page.locator(".atlas-complaint-specialty")).toHaveCount(2);
    await expect(page.locator(".atlas-complaint-reason")).toHaveCount(2);
    await expect(page.locator(".atlas-complaint-emergency-short")).toBeVisible();

    await page.locator(".atlas-complaint-compare-button").first().click();
    await expect(page.locator("#atlas-complaint-comparison")).toBeVisible();
    await expect(page.locator("#atlas-complaint-comparison")).toContainText(/\S+/);
    await expect(page.locator(".atlas-complaint-compare-button").first()).toHaveAttribute("aria-expanded", "true");

    const dims = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(dims.scroll).toBeLessThanOrEqual(dims.client + 1);

    const url = new URL(page.url());
    for (const key of ["complaint", "symptom", "redFlag", "emergencyAnswer"]) {
      expect(url.searchParams.has(key)).toBe(false);
    }

    await page.locator(".atlas-complaint-text-button").click();
    await expect(page.locator(".atlas-complaint-choice").first()).toBeVisible();
  }
});

test("positive or uncertain danger answer blocks Page 05 routine recommendations", async ({ page }) => {
  await page.goto("/care/complaints?lang=en");
  await page.locator(".atlas-complaint-choice").first().click();
  await page.locator(".atlas-complaint-answers button").first().click(); // Yes / not sure
  await expect(page.locator(".atlas-complaint-alert[role='alert']")).toBeVisible();
  await expect(page.locator(".atlas-complaint-next button")).toHaveCount(0);
  await expect(page.locator(".atlas-complaint-specialty")).toHaveCount(0);
});

test("direct Page 05 entry without guide state safely returns to complaint selection", async ({ page }) => {
  await page.goto("/care/complaints/specialties?lang=en");
  await expect(page.getByRole("heading", { name: "Start by choosing a concern." })).toBeVisible();
  await expect(page.locator(".atlas-complaint-specialty")).toHaveCount(0);
  await page.locator(".atlas-complaint-main-action").click();
  await expect(page.locator(".atlas-complaint-choice").first()).toBeVisible();
});
