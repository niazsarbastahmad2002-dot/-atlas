import { expect, test } from "@playwright/test";

async function setLocale(context, locale) {
  await context.addCookies([{ name: "atlas_ui_locale", value: locale, url: "http://127.0.0.1:3100", sameSite: "Lax" }]);
}

test("unauthenticated receptionist sees language choice, work email and optional quick sign-in", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Open Atlas. Start the clinic day." })).toBeVisible();
  await expect(page.getByRole("button", { name: "کوردی سۆرانی" })).toBeVisible();
  await expect(page.getByRole("button", { name: "کوردی بادینی" })).toBeVisible();
  await expect(page.getByRole("button", { name: /العربية/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /English/ })).toBeVisible();
  await expect(page.getByLabel("Work email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send Atlas email" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Use quick sign-in" })).toBeVisible();
});

test("language picker persists a pre-auth Sorani choice", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "کوردی سۆرانی" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: /Atlas بکەرەوە/ })).toBeVisible();
});

test("language picker persists a pre-auth Badini choice", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "کوردی بادینی" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: /Atlas ڤەکە/ })).toBeVisible();
});

test("expired or consumed email link shows plain recovery language with email ready", async ({ page }) => {
  await page.goto("/auth/callback");
  await expect(page).toHaveURL(/\/login\?error=invalid_link/);
  await expect(page.locator(".login-notice[role='alert']")).toContainText("expired or was already used");
  await expect(page.getByLabel("Work email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send Atlas email" })).toBeVisible();
});

test("signed-out state confirms logout without technical jargon", async ({ page }) => { await page.goto("/login?notice=signed_out"); await expect(page.getByRole("status")).toContainText("signed out safely"); });
test("Sorani login is RTL and work email is immediately available", async ({ context, page }) => { await setLocale(context, "ku"); await page.goto("/login"); await expect(page.locator("html")).toHaveAttribute("dir", "rtl"); await expect(page.getByRole("heading", { name: /Atlas بکەرەوە/ })).toBeVisible(); await expect(page.getByLabel("ئیمەیڵی کار")).toBeVisible(); await expect(page.getByRole("button", { name: "ئیمەیڵی Atlas بنێرە" })).toBeVisible(); });
test("Badini login is RTL", async ({ context, page }) => { await setLocale(context, "bd"); await page.goto("/login"); await expect(page.locator("html")).toHaveAttribute("dir", "rtl"); await expect(page.getByRole("heading", { name: /Atlas ڤەکە/ })).toBeVisible(); });
test("Arabic login is RTL", async ({ context, page }) => { await setLocale(context, "ar"); await page.goto("/login"); await expect(page.locator("html")).toHaveAttribute("dir", "rtl"); await expect(page.getByRole("heading", { name: /افتح Atlas/ })).toBeVisible(); await expect(page.getByLabel(/بريد العمل/)).toBeVisible(); });
test("English login is LTR", async ({ context, page }) => { await setLocale(context, "en"); await page.goto("/login"); await expect(page.locator("html")).toHaveAttribute("dir", "ltr"); });

test("safe demo creates and changes a synthetic appointment without contacting Supabase", async ({ page }) => {
  const externalRequests = []; page.on("request", (request) => { const url = request.url(); if (url.includes("supabase.co")) externalRequests.push(url); });
  await page.goto("/demo"); await page.getByLabel("Test clinic name").fill("Hawler Test Clinic"); await page.getByRole("button", { name: "Open test workspace" }).click(); await expect(page.getByRole("heading", { name: "Hawler Test Clinic" })).toBeVisible();
  const future = new Date(Date.now() + 2 * 60 * 60 * 1000); const pad = (value) => String(value).padStart(2, "0"); const baghdad = new Date(future.getTime() + 3 * 60 * 60 * 1000); const localValue = `${baghdad.getUTCFullYear()}-${pad(baghdad.getUTCMonth() + 1)}-${pad(baghdad.getUTCDate())}T${pad(baghdad.getUTCHours())}:${pad(baghdad.getUTCMinutes())}`;
  await page.getByLabel("Patient name").fill("Dilan Karim"); await page.getByLabel("Iraqi mobile number").fill("0750 123 4567"); await page.getByLabel("Doctor").fill("Dr. Sara"); await page.getByLabel(/Date and time/).fill(localValue); await page.getByRole("button", { name: "Save appointment" }).click();
  await expect(page.getByText("Dilan Karim")).toBeVisible(); await expect(page.getByText("0750 123 4567")).toBeVisible(); await page.getByRole("button", { name: "Confirm" }).click(); await expect(page.locator(".status-confirmed")).toContainText("Confirmed"); await page.getByRole("button", { name: "Cancel" }).click(); await expect(page.locator(".status-cancelled")).toContainText("Cancelled"); await page.getByRole("button", { name: "Reopen" }).click(); await expect(page.locator(".status-pending")).toContainText("Pending"); expect(externalRequests).toEqual([]);
});

test("demo remains usable without horizontal overflow", async ({ page }) => { await page.goto("/demo"); await page.getByLabel("Test clinic name").fill("Erbil Demo Clinic"); await page.getByRole("button", { name: "Open test workspace" }).click(); const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth })); expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1); });
