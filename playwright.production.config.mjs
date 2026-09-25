import { defineConfig } from "@playwright/test";

const baseURL = process.env.ATLAS_PRODUCTION_URL ?? "https://atlasclinic.dpdns.org";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "production-smoke.spec.mjs",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "iphone-webkit", use: { browserName: "webkit", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "ipad-webkit", use: { browserName: "webkit", viewport: { width: 1024, height: 1366 }, hasTouch: true } },
    { name: "desktop-chromium", use: { browserName: "chromium", viewport: { width: 1440, height: 900 } } },
  ],
});
