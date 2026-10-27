import { defineConfig } from "@playwright/test";

// This isolated QA starts a local fake phone provider, not real Supabase.
// It NEVER sends SMS/WhatsApp, creates real users, or writes Atlas data.
const baseURL = "http://127.0.0.1:3101";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "patient-registration-synthetic.spec.mjs",
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? "line" : "list",
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: [
    {
      command: "node e2e/fixtures/patient-auth-mock.mjs",
      url: "http://127.0.0.1:54321/auth/v1/settings",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1 --port 3101",
      url: baseURL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_qa_only",
        NEXT_PUBLIC_ATLAS_PHONE_SIGNUP_ENABLED: "true",
        ATLAS_PATIENT_REGISTRATION_ENABLED: "true",
        NEXT_PUBLIC_ATLAS_WHATSAPP_OTP_ENABLED: "false",
        SITE_URL: baseURL,
      },
    },
  ],
  projects: [
    { name: "iphone", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "ipad", use: { viewport: { width: 1024, height: 1366 }, hasTouch: true } },
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
  ],
});
