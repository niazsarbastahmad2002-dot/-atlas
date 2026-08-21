import { expect, test } from "@playwright/test";

async function setLocale(context, locale) {
  await context.addCookies([{ name: "atlas_ui_locale", value: locale, url: "http://127.0.0.1:3100", sameSite: "Lax" }]);
}

test("unauthenticated receptionist sees language choice, country-aware phone verification and optional passkey", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Your clinic starts with your number." })).toBeVisible();
  await expect(page.getByRole("button", { name: "کوردی سۆرانی" })).toBeVisible();
  await expect(page.getByRole("button", { name: "کوردی بادینی" })).toBeVisible();
  await expect(page.getByRole("button", { name: /العربية/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /English/ })).toBeVisible();
  await expect(page.getByLabel("Country / code")).toHaveValue("+964");
  await expect(page.getByLabel("Mobile number")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send verification code" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Use saved passkey" })).toBeVisible();
});

test("international phone mode accepts a full country-code input surface", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Country / code").selectOption("international");
  await expect(page.getByLabel("Mobile number")).toHaveAttribute("placeholder", "+4915123456789");
});

test("phone login rejects malformed numbers before contacting the verification provider", async ({ page }) => {
  const authRequests = [];
  page.on("request", (request) => {
    if (request.url().includes("supabase.co/auth")) authRequests.push(request.url());
  });
  await page.goto("/login");
  await page.getByLabel("Mobile number").fill("12345");
  await page.getByRole("button", { name: "Send verification code" }).click();
  await expect(page.getByRole("alert")).toContainText("Enter a valid mobile number");
  expect(authRequests).toEqual([]);
});

test("phone login fits an iPhone-sized viewport without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await expect(page.getByLabel("Country / code")).toBeVisible();
  await expect(page.getByLabel("Mobile number")).toBeVisible();
  await expect(page.getByLabel("Mobile number")).toHaveAttribute("type", "tel");
  await expect(page.getByLabel("Mobile number")).toHaveAttribute("inputmode", "tel");
  const dimensions = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
});

test("language picker persists a pre-auth Sorani choice", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "کوردی سۆرانی" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: /کلینیکەکەت بە ژمارەی مۆبایلەکەت/ })).toBeVisible();
});

test("language picker persists a pre-auth Badini choice", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "کوردی بادینی" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: /کلینیکا تە ب ژمارا موبایلا تە/ })).toBeVisible();
});

test("expired or consumed legacy auth link shows recovery language with phone sign-in ready", async ({ page }) => {
  await page.goto("/auth/callback");
  await expect(page).toHaveURL(/\/login\?error=invalid_link/);
  await expect(page.locator(".login-notice[role='alert']")).toContainText("no longer valid");
  await expect(page.getByLabel("Mobile number")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send verification code" })).toBeVisible();
});

test("signed-out state confirms logout without technical jargon", async ({ page }) => {
  await page.goto("/login?notice=signed_out");
  await expect(page.getByRole("status")).toContainText("signed out safely");
});

test("clinic deletion notice confirms the account is preserved and phone sign-in is ready", async ({ page }) => {
  await page.goto("/login?notice=clinic_deleted");
  await expect(page.getByRole("status")).toContainText("Atlas account is still safe");
  await expect(page.getByLabel("Mobile number")).toBeVisible();
});

test("Sorani login is RTL and phone verification is immediately available", async ({ context, page }) => {
  await setLocale(context, "ku");
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: /کلینیکەکەت بە ژمارەی مۆبایلەکەت/ })).toBeVisible();
  await expect(page.getByLabel("ژمارەی مۆبایل")).toBeVisible();
  await expect(page.getByRole("button", { name: "کۆدی پشتڕاستکردنەوە بنێرە" })).toBeVisible();
});

test("Badini login is RTL", async ({ context, page }) => {
  await setLocale(context, "bd");
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: /کلینیکا تە ب ژمارا موبایلا تە/ })).toBeVisible();
  await expect(page.getByLabel("ژمارا موبایلێ")).toBeVisible();
});

test("Arabic login is RTL", async ({ context, page }) => {
  await setLocale(context, "ar");
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: /عيادتك تبدأ من رقمك/ })).toBeVisible();
  await expect(page.getByLabel("رقم الموبايل")).toBeVisible();
});

test("English login is LTR", async ({ context, page }) => {
  await setLocale(context, "en");
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});

test("safe demo creates and changes a synthetic appointment without contacting Supabase", async ({ page }) => {
  const externalRequests = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("supabase.co")) externalRequests.push(url);
  });
  await page.goto("/demo");
  await page.getByLabel("Test clinic name").fill("Hawler Test Clinic");
  await page.getByRole("button", { name: "Open test workspace" }).click();
  await expect(page.getByRole("heading", { name: "Hawler Test Clinic" })).toBeVisible();
  const future = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const pad = (value) => String(value).padStart(2, "0");
  const baghdad = new Date(future.getTime() + 3 * 60 * 60 * 1000);
  const localValue = `${baghdad.getUTCFullYear()}-${pad(baghdad.getUTCMonth() + 1)}-${pad(baghdad.getUTCDate())}T${pad(baghdad.getUTCHours())}:${pad(baghdad.getUTCMinutes())}`;
  await page.getByLabel("Patient name").fill("Dilan Karim");
  await page.getByLabel("Iraqi mobile number").fill("0750 123 4567");
  await page.getByLabel("Doctor").fill("Dr. Sara");
  await page.getByLabel(/Date and time/).fill(localValue);
  await page.getByRole("button", { name: "Save appointment" }).click();
  await expect(page.getByText("Dilan Karim")).toBeVisible();
  await expect(page.getByText("0750 123 4567")).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.locator(".status-confirmed")).toContainText("Confirmed");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.locator(".status-cancelled")).toContainText("Cancelled");
  await page.getByRole("button", { name: "Reopen" }).click();
  await expect(page.locator(".status-pending")).toContainText("Pending");
  expect(externalRequests).toEqual([]);
});

test("demo remains usable without horizontal overflow", async ({ page }) => {
  await page.goto("/demo");
  await page.getByLabel("Test clinic name").fill("Erbil Demo Clinic");
  await page.getByRole("button", { name: "Open test workspace" }).click();
  const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
});