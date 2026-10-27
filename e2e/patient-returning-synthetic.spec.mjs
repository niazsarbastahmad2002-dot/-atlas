import { expect, test } from "@playwright/test";

// Strict localhost-only returning-patient QA with a seeded fake identity.
// It cannot send SMS/WhatsApp or create an actual Atlas Auth user.
const locales = [
  { id: "en", dir: "ltr" },
  { id: "ku", dir: "rtl" },
  { id: "bd", dir: "rtl" },
  { id: "ar", dir: "rtl" },
];

async function restrictTraffic(page) {
  const violations = [];
  await page.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.hostname !== "127.0.0.1" || !["3101", "54321"].includes(url.port)) {
      violations.push("External request blocked: " + url.origin);
      await route.abort("blockedbyclient");
      return;
    }
    const writeAllowed = req.method() === "POST" && (
      (url.port === "54321" && ["/auth/v1/otp", "/auth/v1/verify"].includes(url.pathname)) ||
      (url.port === "3101" && url.pathname === "/patient-account/api/session")
    );
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method()) && !writeAllowed) {
      // Even local development diagnostics/telemetry are blocked.
      if (!["/api/analytics", "/__nextjs_original-stack-frames"].includes(url.pathname)) {
        violations.push("Unexpected application write blocked: " + url.pathname);
      }
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
  return () => expect(violations).toEqual([]);
}

test("existing patient signs in, but new registration stays closed in all four languages", async ({ page, request }) => {
  const checkTraffic = await restrictTraffic(page);
  const otpPayloads = [];
  let sessions = 0;
  page.on("request", (req) => {
    if (req.method() === "POST" && new URL(req.url()).pathname === "/auth/v1/otp") {
      otpPayloads.push(req.postDataJSON());
    }
  });
  await page.route("**/patient-account/api/session", async (route) => {
    sessions++;
    expect(route.request().headers().authorization).toMatch(/^Bearer /);
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"status":"ok"}' });
  });
  for (const [index, { id, dir }] of locales.entries()) {
    await page.goto("/patient-register?lang=" + id);
    await expect(page.locator("main.patient-register-page")).toHaveAttribute("dir", dir);
    await expect(page.locator(".patient-register-unavailable")).toBeVisible();
    await expect(page.locator(".patient-account-login-form")).toHaveCount(0);
    await page.goto("/patient-account?lang=" + id);
    await expect(page.locator("main.patient-account-page")).toHaveAttribute("dir", dir);
    await expect(page.locator(".patient-account-registration-link")).toHaveCount(0);
    await expect(page.locator(".patient-account-login-form")).toBeVisible();
    await page.locator('.patient-account-login-form input[type="tel"]').fill("07500000000");
    await page.locator('.patient-account-login-form button[type="submit"]').click();
    await expect(page.locator("#patient-account-otp")).toBeVisible();
    expect(otpPayloads.at(-1)?.phone).toBe("+9647500000000");
    expect(otpPayloads.at(-1)?.create_user).toBe(false);
    await page.locator("#patient-account-otp").fill("123456");
    // A URL assertion alone can succeed before verify finishes: this form
    // already lives at /patient-account?lang=<locale>. Wait for its actual
    // server session POST AND subsequent full-document replacement.
    const sessionResponse = page.waitForResponse((response) =>
      response.request().method() === "POST"
      && new URL(response.url()).pathname === "/patient-account/api/session",
    );
    const navigation = page.waitForEvent("framenavigated", {
      predicate: (frame) => frame === page.mainFrame()
        && new URL(frame.url()).pathname === "/patient-account"
        && new URL(frame.url()).searchParams.get("lang") === id,
    });
    await page.locator('.patient-account-login-form button[type="submit"]').click();
    expect((await sessionResponse).status()).toBe(200);
    await navigation;
    await expect(page).toHaveURL(new RegExp("/patient-account\\?lang=" + id + "$"));
    await expect.poll(() => sessions).toBe(index + 1);
  }
  expect(otpPayloads).toHaveLength(4);
  expect(sessions).toBe(4);
  const response = await request.get("http://127.0.0.1:54321/__qa/state", { maxRetries: 2 });
  expect(response.ok()).toBeTruthy();
  const state = await response.json();
  expect(state.syntheticPatientCount).toBe(1);
  expect(state.syntheticPatientCreatedCount).toBe(0);
  expect(state.syntheticClinicMembershipCount).toBe(0);
  expect(state.syntheticAppointmentCount).toBe(0);
  expect(state.successfulVerifications).toBeGreaterThanOrEqual(4);
  checkTraffic();
});

test("unknown number cannot create a patient account through returning sign-in", async ({ page, request }) => {
  const checkTraffic = await restrictTraffic(page);
  const otpPayloads = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && new URL(req.url()).pathname === "/auth/v1/otp") {
      otpPayloads.push(req.postDataJSON());
    }
  });
  await page.goto("/patient-account?lang=en");
  await expect(page.locator(".patient-account-login-form")).toBeVisible();
  await page.locator('.patient-account-login-form input[type="tel"]').fill("07500000001");
  await page.locator('.patient-account-login-form button[type="submit"]').click();
  await expect(page.locator('.notice-error[role="alert"]')).toContainText("Atlas could not sign you in");
  await expect(page.locator("#patient-account-otp")).toHaveCount(0);
  expect(otpPayloads).toHaveLength(1);
  expect(otpPayloads[0].create_user).toBe(false);
  const response = await request.get("http://127.0.0.1:54321/__qa/state", { maxRetries: 2 });
  const state = await response.json();
  expect(state.syntheticPatientCount).toBe(1);
  expect(state.syntheticPatientCreatedCount).toBe(0);
  checkTraffic();
});
