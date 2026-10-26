import { expect, test } from "@playwright/test";

const locales = [
  { id: "en", title: "Enter your email sign-in code", dir: "ltr" },
  { id: "ku", title: "کۆدی چوونەژوورەوەی ئیمەیڵ بنووسە", dir: "rtl" },
  { id: "bd", title: "کۆدێ چوونەژوورێ یێ ئیمەیلێ بنڤیسە", dir: "rtl" },
  { id: "ar", title: "أدخل رمز الدخول من البريد", dir: "rtl" },
];

test("email code entry is local, four-language and narrow-screen accessible", async ({ page, context }) => {
  test.setTimeout(90000);
  const remoteVerify = [];
  page.on("request", (request) => {
    if (request.url().includes("/auth/v1/verify")) remoteVerify.push(request.method());
  });
  for (const item of locales) {
    await context.addCookies([{ name: "atlas_ui_locale", value: item.id, url: "http://127.0.0.1:3100", sameSite: "Lax" }]);
    await page.goto("/auth/email/complete-link");
    await expect(page.locator("html")).toHaveAttribute("dir", item.dir);
    await expect(page.getByRole("heading", { name: item.title })).toBeVisible();
    await expect(page.locator("#atlas-email-code-address")).toHaveAttribute("type", "email");
    await expect(page.locator("#atlas-email-code-token")).toHaveAttribute("autocomplete", "one-time-code");
    await expect(page.locator("#atlas-email-code-token")).toHaveAttribute("inputmode", "numeric");
    await page.locator("#atlas-email-code-address").fill("qa@example.com");
    await page.locator("#atlas-email-code-token").fill("12345");
    await page.locator("section[aria-labelledby='atlas-email-code-heading'] button[type=submit]").click();
    await expect(page.locator("section[aria-labelledby='atlas-email-code-heading'] [role=alert]")).toBeVisible();
    await expect(page.locator("#atlas-email-code-token")).toHaveValue("");
    const metrics = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
  }
  expect(remoteVerify).toEqual([]);
});

test("synthetic email OTP reaches Supabase verify endpoint only on submit; failures redact details", async ({ page }) => {
  test.setTimeout(60000);
  let attempts = 0;
  await page.route("**/auth/v1/verify", async (route) => {
    attempts += 1;
    await route.fulfill({
      status: 403,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" },
      body: JSON.stringify({ code: "otp_expired", message: "Invalid or expired" }),
    });
  });
  await page.goto("/auth/email/complete-link");
  await page.locator("#atlas-email-code-address").fill("synthetic@example.com");
  await page.locator("#atlas-email-code-token").fill("123456");
  await page.locator("section[aria-labelledby='atlas-email-code-heading'] button[type=submit]").click();
  await expect(page.locator("#atlas-email-code-token")).toHaveValue("");
  await expect(page.locator("section[aria-labelledby='atlas-email-code-heading'] [role=alert]")).toBeVisible();
  expect(attempts).toBe(1);
  await expect(page).toHaveURL(/\/auth\/email\/complete-link/);
  await expect(page.getByText("Invalid or expired", { exact: true })).toHaveCount(0);
});
