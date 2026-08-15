import { expect, test } from "@playwright/test";

async function setLocale(context, locale) {
  await context.addCookies([{
    name: "atlas_ui_locale",
    value: locale,
    url: "http://127.0.0.1:3100",
    sameSite: "Lax",
  }]);
}

test("unauthenticated receptionist sees one primary open action and recovery stays secondary", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Open Atlas. Start the day." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Atlas" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New device or recovery" })).toBeVisible();
  await expect(page.getByLabel("Work email")).toHaveCount(0);

  await page.getByRole("button", { name: "New device or recovery" }).click();
  await expect(page.getByLabel("Work email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send Atlas email" })).toBeVisible();
});

test("expired or consumed email link shows plain recovery language", async ({ page }) => {
  await page.goto("/auth/callback");
  await expect(page).toHaveURL(/\/login\?error=invalid_link/);
  await expect(page.getByRole("alert")).toContainText("expired or was already used");
  await expect(page.getByRole("button", { name: "New device or recovery" })).toBeVisible();
});

test("signed-out state confirms logout without technical jargon", async ({ page }) => {
  await page.goto("/login?notice=signed_out");
  await expect(page.getByRole("status")).toContainText("signed out safely");
});

test("Sorani login is RTL and uses localized recovery copy", async ({ context, page }) => {
  await setLocale(context, "ku");
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: /Atlas بکەرەوە/ })).toBeVisible();
  await page.getByRole("button", { name: /ئامێری نوێ/ }).click();
  await expect(page.getByLabel("ئیمەیڵی کار")).toBeVisible();
});

test("Arabic login is RTL", async ({ context, page }) => {
  await setLocale(context, "ar");
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: /افتح Atlas/ })).toBeVisible();
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
