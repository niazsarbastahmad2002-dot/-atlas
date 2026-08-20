import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { atlasPublicCompanyProfile } from "../lib/public-company-profile.ts";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const envKeys = [
  "ATLAS_LEGAL_ENTITY_NAME",
  "ATLAS_LEGAL_ENTITY_NAME_LOCAL",
  "ATLAS_COMPANY_REGISTRATION_NUMBER",
  "ATLAS_REGISTERED_BUSINESS_ADDRESS",
  "ATLAS_PUBLIC_BUSINESS_PHONE",
  "ATLAS_SUPPORT_EMAIL",
  "ATLAS_PRIVACY_EMAIL",
  "ATLAS_PUBLIC_SITE_URL",
] as const;

function withEnv(values: Partial<Record<(typeof envKeys)[number], string>>, run: () => void) {
  const previous = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  try {
    for (const key of envKeys) delete process.env[key];
    for (const [key, value] of Object.entries(values)) process.env[key] = value;
    run();
  } finally {
    for (const key of envKeys) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("verified company identity is published only from explicit server configuration", () => {
  withEnv({
    ATLAS_LEGAL_ENTITY_NAME: "Atlas Appointments Technologies LLC",
    ATLAS_LEGAL_ENTITY_NAME_LOCAL: "Atlas Appointments Technologies",
    ATLAS_COMPANY_REGISTRATION_NUMBER: "REG-123",
    ATLAS_REGISTERED_BUSINESS_ADDRESS: "Erbil, Kurdistan Region, Iraq",
    ATLAS_PUBLIC_BUSINESS_PHONE: "+964 750 000 0000",
    ATLAS_SUPPORT_EMAIL: "support@atlasappointments.com",
    ATLAS_PRIVACY_EMAIL: "privacy@atlasappointments.com",
    ATLAS_PUBLIC_SITE_URL: "https://atlasappointments.com/path",
  }, () => {
    const company = atlasPublicCompanyProfile();
    assert.equal(company.isVerifiedCompanyProfile, true);
    assert.equal(company.legalEntityName, "Atlas Appointments Technologies LLC");
    assert.equal(company.registrationNumber, "REG-123");
    assert.equal(company.supportEmail, "support@atlasappointments.com");
    assert.equal(company.privacyEmail, "privacy@atlasappointments.com");
    assert.equal(company.canonicalOrigin, "https://atlasappointments.com");
  });
});

test("invalid company contact values fail closed to the current production identity", () => {
  withEnv({
    ATLAS_LEGAL_ENTITY_NAME: "Unverified Name",
    ATLAS_SUPPORT_EMAIL: "not-an-email",
    ATLAS_PUBLIC_SITE_URL: "javascript:alert(1)",
  }, () => {
    const company = atlasPublicCompanyProfile();
    assert.equal(company.isVerifiedCompanyProfile, false);
    assert.equal(company.supportEmail, "niazsarbastahmad2002@gmail.com");
    assert.equal(company.canonicalOrigin, "https://atlasdemofixed.vercel.app");
  });
});

test("public policy pages do not hard-code the founder contact", async () => {
  const [support, privacy, terms, deletion, profile] = await Promise.all([
    read("app/support/page.tsx"),
    read("app/privacy/page.tsx"),
    read("app/terms/page.tsx"),
    read("app/data-deletion/page.tsx"),
    read("lib/public-company-profile.ts"),
  ]);

  for (const page of [support, privacy, terms, deletion]) {
    assert.doesNotMatch(page, /niazsarbastahmad2002@gmail\.com/);
    assert.match(page, /atlasPublicCompanyProfile/);
  }
  assert.match(profile, /ATLAS_LEGAL_ENTITY_NAME/);
  assert.match(profile, /ATLAS_COMPANY_REGISTRATION_NUMBER/);
  assert.match(profile, /ATLAS_SUPPORT_EMAIL/);
  assert.match(profile, /ATLAS_PRIVACY_EMAIL/);
});
