import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      ATLAS_E2E_NO_AUTH: "true",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_atlas_e2e_placeholder",
      SITE_URL: baseURL,
    },
  },
  projects: [
    { name: "iphone", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "galaxy", use: { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true } },
    { name: "ipad", use: { viewport: { width: 1024, height: 1366 }, hasTouch: true } },
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
  ],
});
