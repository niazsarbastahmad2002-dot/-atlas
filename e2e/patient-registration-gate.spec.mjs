import { expect, test } from "@playwright/test";

// No authentication provider, OTP, patient data, or clinic writes are needed.
// This regression covers the intentionally disabled pre-launch state.
const locales = ["en", "ku", "bd", "ar"];

test("unreleased patient registration stays unavailable and private across locales and viewports", async ({ page }) => {
  test.skip(
    process.env.ATLAS_PATIENT_REGISTRATION_ENABLED === "true",
    "The rollout-enabled journey requires a separate synthetic patient/OTP QA environment",
  );
  test.setTimeout(120_000);

  for (const locale of locales) {
    const direction = locale === "en" ? "ltr" : "rtl";

    const response = await page.goto("/patient-register?lang=" + locale);
    expect(response?.status()).toBeLessThan(400);
    const registration = page.locator("main.patient-register-page");
    await expect(registration).toHaveAttribute("dir", direction);
    await expect(registration).toHaveAttribute("lang", locale === "en" ? "en" : /.+/);
    await expect(registration.locator("h1")).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(registration.locator(".patient-register-unavailable")).toBeVisible();
    await expect(registration.locator(".patient-account-login-form")).toHaveCount(0);
    await expect(registration.locator(".patient-register-languages a")).toHaveCount(4);
    await expect(registration.locator('.patient-register-languages a[aria-current="page"]'))
      .toHaveAttribute("href", "/patient-register?lang=" + locale);

    const viewport = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(viewport.scroll, "Registration must not overflow the viewport").toBeLessThanOrEqual(viewport.client + 2);

    await page.goto("/patient-account?lang=" + locale);
    await expect(page.locator("main.patient-account-page")).toHaveAttribute("dir", direction);
    await expect(page.locator(".patient-account-registration-link")).toHaveCount(0);
  }
});
