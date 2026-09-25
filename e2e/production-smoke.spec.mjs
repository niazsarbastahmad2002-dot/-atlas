import { expect, test } from "@playwright/test";

test("production login renders safely without sending authentication traffic", async ({ page }) => {
  const authWrites = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" && /\/auth\/v1\//.test(request.url())) authWrites.push(request.url());
  });

  await page.goto("/login", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading")).toBeVisible();
  await expect(page.getByRole("button", { name: "کوردی سۆرانی" })).toBeVisible();
  await expect(page.getByRole("button", { name: /English/ })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
  expect(authWrites).toEqual([]);
});

test("production safe demo supports the receptionist appointment flow without backend writes", async ({ page }) => {
  const backendWrites = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" && request.url().includes("supabase.co")) backendWrites.push(request.url());
  });

  await page.goto("/demo", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Hawler Sample Clinic" })).toBeVisible();

  await page.getByLabel("Patient name").fill("Atlas Smoke Patient");
  await page.getByLabel("Iraqi mobile number").fill("0750 000 9999");
  await page.getByLabel(/Time/).fill("11:45");
  await page.getByRole("button", { name: "Save sample appointment" }).click();

  const appointment = page.locator("article.appointment-row").filter({ hasText: "Atlas Smoke Patient" });
  await expect(appointment).toContainText("0750 000 9999");
  await appointment.getByRole("button", { name: "Confirm" }).click();
  await expect(appointment.locator(".status-confirmed")).toContainText("Confirmed");

  const dimensions = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
  expect(backendWrites).toEqual([]);
});
