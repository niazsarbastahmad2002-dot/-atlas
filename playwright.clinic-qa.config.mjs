import { defineConfig } from "@playwright/test";

// Manual QA only. Screenshots/videos/traces OFF to prevent leaking private sessions.
export default defineConfig({
  testDir: "./e2e",
  testMatch: "clinic-authenticated-readonly.spec.mjs",
  timeout: 45_000,
  expect: { timeout: 12_000 },
  workers: 1,
  reporter: "line",
  use: {
    baseURL: process.env.ATLAS_PRODUCTION_URL ?? "https://atlasclinic.dpdns.org",
    trace: "off", screenshot: "off", video: "off",
  },
  projects: [
    { name: "qa-iphone-webkit", use: { browserName: "webkit", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "qa-ipad-webkit", use: { browserName: "webkit", viewport: { width: 1024, height: 1366 }, hasTouch: true } },
    { name: "qa-desktop-chromium", use: { browserName: "chromium", viewport: { width: 1440, height: 900 } } },
  ],
});
