import { defineConfig } from "@playwright/test";
import registrationQA from "./playwright.patient-registration-qa.config.mjs";

// The same local fake provider, seeded with a returning patient. No real Auth
// users, outbound messages, production project or clinic data are touched.
export default defineConfig({
  ...registrationQA,
  testMatch: "patient-returning-synthetic.spec.mjs",
  webServer: [
    { ...registrationQA.webServer[0], env: {
      ...registrationQA.webServer[0].env,
      ATLAS_SYNTHETIC_EXISTING_ONLY: "true",
    }},
    { ...registrationQA.webServer[1], env: {
      ...registrationQA.webServer[1].env,
      ATLAS_PATIENT_REGISTRATION_ENABLED: "false",
      NEXT_PUBLIC_ATLAS_PHONE_SIGNUP_ENABLED: "true",
    }},
  ],
});
