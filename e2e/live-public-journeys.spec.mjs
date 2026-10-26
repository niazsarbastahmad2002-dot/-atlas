import { expect, test } from "@playwright/test";

// Public production QA: no login, no customer data, and no writes to Atlas.
const locales = [
  { id: "en", dir: "ltr" },
  { id: "ku", dir: "rtl" },
  { id: "bd", dir: "rtl" },
  { id: "ar", dir: "rtl" },
];
const discoveryPages = ["clinics", "specialties", "locations"];
async function protectReadOnlyRun(page) {
  const attemptedWrites = [];
  const javascriptErrors = [];
  const serverErrors = [];
  const origin = new URL(test.info().project.use.baseURL).origin;
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
      const path = new URL(request.url()).pathname;
      // Live Atlas navigation emits POST telemetry. Block it without flagging a
      // product mutation; any OTHER attempted write still fails the QA run.
      if (request.method() === "POST" && path === "/api/analytics") {
        await route.abort("blockedbyclient");
        return;
      }
      attemptedWrites.push(request.method() + " " + path);
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
  page.on("pageerror", (error) => javascriptErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 500 && new URL(response.url()).origin === origin) {
      serverErrors.push(response.status() + " " + new URL(response.url()).pathname);
    }
  });

  return () => {
    expect(attemptedWrites, "Live QA must never issue browser-side writes").toEqual([]);
    expect(javascriptErrors, "Browser runtime exceptions").toEqual([]);
    expect(serverErrors, "Atlas production 5xx responses").toEqual([]);
  };
}

async function assertReadablePage(page, direction) {
  await expect(page.locator("main").first()).toBeVisible();
  await expect.poll(() => page.locator("main").first().evaluate(
    (element) => getComputedStyle(element).direction
  )).toBe(direction);
  await expect(page.locator("main h1").first()).toBeVisible();
  const heading = (await page.locator("main h1").first().innerText()).trim();
  expect(heading, "Public page must have a meaningful title").not.toBe("");
  expect(heading).not.toMatch(/application error|internal server error|page not found/i);

  const size = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(size.scroll, "No horizontal overflow at this device viewport")
    .toBeLessThanOrEqual(size.client + 2);
}

async function openPublicPage(page, path, direction) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response, "Navigation must complete: " + path).not.toBeNull();
  expect(response.status(), "Public route must not be HTTP error: " + path).toBeLessThan(400);
  await assertReadablePage(page, direction);
}

test("live public patient journey works from Home to Find Care and Explore", async ({ page }) => {
  test.setTimeout(120_000);
  const assertSafe = await protectReadOnlyRun(page);
  await openPublicPage(page, "/?lang=en", "ltr");
  await page.locator(".atlas-patient-entry[href*='/care']").click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/care");
  await assertReadablePage(page, "ltr");

  for (const kind of discoveryPages) {
    await page.locator(".atlas-care-more-pages a[href*='/explore/" + kind + "']").click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/explore/" + kind);
      await assertReadablePage(page, "ltr");
    await page.locator(".atlas-explore-back").click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/care");
    }
  assertSafe();
});

test("all four production languages render public Patient journeys without overflow", async ({ context }) => {
  test.setTimeout(180_000);
  // Isolate independent public page visits so unloading a previous page cannot
  // cancel Next.js speculative RSC requests and create false WebKit errors.
  for (const locale of locales) {
    const paths = ["/care", ...discoveryPages.map((kind) => "/explore/" + kind), "/patient-account"];
    for (const path of paths) {
      await test.step(locale.id + " " + path, async () => {
        const page = await context.newPage();
        try {
          const assertSafe = await protectReadOnlyRun(page);
          await openPublicPage(page, path + "?lang=" + locale.id, locale.dir);
          await page.waitForTimeout(250);
          assertSafe();
        } finally {
          await page.close();
        }
      });
    }
  }
});

test("production version endpoint reports the deployed exact SHA", async ({ request }) => {
  const response = await request.get("/api/version");
  expect(response.ok()).toBeTruthy();
  const result = await response.json();
  expect(result.ok).toBe(true);
  expect(result.commit).toMatch(/^[a-f0-9]{40}$/);
  if (process.env.ATLAS_EXPECTED_COMMIT) {
    expect(result.commit).toBe(process.env.ATLAS_EXPECTED_COMMIT);
  }
});

test("signed-out clinic workspaces are gated on the live website", async ({ context }) => {
  test.setTimeout(90_000);
  const paths = [
    "/dashboard",
    "/dashboard/history",
    "/dashboard/assistant",
    "/dashboard/settings",
    "/dashboard/staff",
  ];
  for (const path of paths) {
    await test.step("signed-out " + path, async () => {
      const page = await context.newPage();
      try {
        const assertSafe = await protectReadOnlyRun(page);
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await expect.poll(() => new URL(page.url()).pathname,
          { message: "Signed-out access to " + path + " must redirect to /login" }).toBe("/login");
        await expect(page.getByRole("heading").first()).toBeVisible();
        await page.waitForTimeout(250);
        assertSafe();
      } finally {
        await page.close();
      }
    });
  }
});
