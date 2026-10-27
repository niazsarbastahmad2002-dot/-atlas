import { expect, test } from "@playwright/test";

// Synthetic localhost-only flows: fake phone, fake code, fake session response.
// This verifies UI and request contracts, NOT real provider delivery or Supabase RLS.
const testNumber = "07500000000";
const locales = [
  { id: "en", dir: "ltr" },
  { id: "ku", dir: "rtl" },
  { id: "bd", dir: "rtl" },
  { id: "ar", dir: "rtl" },
];

async function isolateTraffic(page) {
  const violations = [];
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname !== "127.0.0.1" ||
        (url.port !== "3101" && url.port !== "54321")) {
      violations.push("External request blocked: " + url.origin);
      await route.abort("blockedbyclient");
      return;
    }
    if (request.method() !== "GET" && request.method() !== "HEAD" &&
        request.method() !== "OPTIONS" &&
        !(request.method() === "POST" && url.port === "54321" &&
          ["/auth/v1/otp", "/auth/v1/verify"].includes(url.pathname)) &&
        !(request.method() === "POST" && url.port === "3101" &&
          url.pathname === "/patient-account/api/session")) {
      // Block telemetry and any unexpected browser-side write.
      // Local Next.js development diagnostics are not Atlas data mutations.
      // Both diagnostics and analytics are still blocked rather than sent.
      if (url.pathname !== "/api/analytics" && url.pathname !== "/__nextjs_original-stack-frames") {
        violations.push("Unexpected write: " + url.pathname);
      }
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
  return () => expect(violations, "No external calls or unexpected writes").toEqual([]);
}

async function submitPhone(page) {
  await page.locator('.patient-account-login-form input[type="tel"]').fill(testNumber);
  await page.locator('.patient-account-login-form button[type="submit"]').click();
  await expect(page.locator("#patient-account-otp")).toBeVisible();
}

test("synthetic phone OTP verifies and preserves all four chosen languages", async ({ page, request }) => {
  const checkTraffic = await isolateTraffic(page);
  let sessionCalls = 0;
  await page.route("**/patient-account/api/session", async (route) => {
    sessionCalls++;
    expect(route.request().headers().authorization).toMatch(/^Bearer /);
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"status":"ok"}' });
  });

  for (const locale of locales) {
    await page.goto("/patient-register?lang=" + locale.id);
    await expect(page.locator("main.patient-register-page")).toHaveAttribute("dir", locale.dir);
    await expect(page.locator(".patient-register-unavailable")).toHaveCount(0);
    await expect(page.locator(".patient-account-login-form")).toBeVisible();
    await submitPhone(page);
    await page.locator("#patient-account-otp").fill("123456");
    // The destination URL is already /patient-account on returning-user flows.
    // Waiting for the actual full-page reload (not just a matching URL)
    // prevents WebKit from racing the next locale against session creation.
    const redirected = page.waitForEvent("framenavigated", {
      predicate: (frame) => frame === page.mainFrame()
        && new URL(frame.url()).pathname === "/patient-account"
        && new URL(frame.url()).searchParams.get("lang") === locale.id,
    });
    await page.locator('.patient-account-login-form button[type="submit"]').click();
    await redirected;
    await page.waitForLoadState("load");
    await expect(page).toHaveURL(new RegExp("/patient-account\\?lang=" + locale.id + "$"));
  }

  expect(sessionCalls).toBe(4);
  const result = await request.get("http://127.0.0.1:54321/__qa/state");
  expect(result.ok()).toBeTruthy();
  const state = await result.json();
  expect(state.syntheticPatientCount).toBe(1); // Repeated phone never creates a second synthetic account.
  expect(state.syntheticPatientCreatedCount).toBe(1);
  expect(state.syntheticClinicMembershipCount).toBe(0);
  expect(state.syntheticAppointmentCount).toBe(0);
  expect(state.successfulVerifications).toBeGreaterThanOrEqual(4);
  checkTraffic();
});

test("invalid phone, expired code and server failure recover without real sends", async ({ page }) => {
  const checkTraffic = await isolateTraffic(page);
  let sessionCalls = 0;
  const otpRequests = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/auth/v1/otp") {
      otpRequests.push(request.postDataJSON());
    }
  });
  await page.route("**/patient-account/api/session", async (route) => {
    sessionCalls++;
    await route.fulfill({ status: 503, contentType: "application/json", body: '{"status":"failed"}' });
  });
  await page.goto("/patient-register?lang=en");
  await page.locator('.patient-account-login-form input[type="tel"]').fill("12345");
  await page.locator('.patient-account-login-form button[type="submit"]').click();
  await expect(page.locator(".notice-error[role=\"alert\"]")).toContainText("Enter a valid Iraqi mobile number");
  expect(otpRequests).toHaveLength(0);
  await submitPhone(page);
  expect(otpRequests).toHaveLength(1);
  expect(otpRequests[0].phone).toBe("+9647500000000");
  expect(otpRequests[0].create_user).toBe(true);
  await page.locator("#patient-account-otp").fill("000000");
  await page.locator('.patient-account-login-form button[type="submit"]').click();
  await expect(page.locator(".notice-error[role=\"alert\"]")).toContainText("incorrect or expired");
  expect(sessionCalls).toBe(0);

  await page.locator("#patient-account-otp").fill("123456");
  await page.locator('.patient-account-login-form button[type="submit"]').click();
  await expect(page.locator(".notice-error[role=\"alert\"]")).toContainText("could not finish creating your patient account");
  expect(sessionCalls).toBe(1);
  await expect(page).toHaveURL(/\/patient-register\?lang=en$/);

  await page.getByRole("button", { name: "Send another code" }).click();
  await expect(page.locator("#patient-account-otp")).toBeVisible();
  expect(otpRequests).toHaveLength(2);
  checkTraffic();
});
