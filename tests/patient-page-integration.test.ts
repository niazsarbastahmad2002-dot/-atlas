import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const care = read("app/care/page.tsx");
const account = read("app/patient-account/page.tsx");
const login = read("app/patient-account/login-form.tsx");
const explore = read("app/explore/[kind]/page.tsx");

test("Patient page routes have one shared account, care results and gated complaint flow", () => {
  for (const path of [
    "app/page.tsx",
    "app/care/page.tsx",
    "app/care/complaints/page.tsx",
    "app/care/complaints/questions/page.tsx",
    "app/care/complaints/specialties/page.tsx",
    "app/care/[clinicSlug]/page.tsx",
    "app/care/[clinicSlug]/[doctorSlug]/page.tsx",
    "app/care/[clinicSlug]/[doctorSlug]/times/page.tsx",
    "app/patient-register/page.tsx",
    "app/patient-account/page.tsx",
    "app/patient/[token]/page.tsx",
    "app/explore/[kind]/page.tsx",
  ]) assert.ok(read(path).length > 0, path);
  assert.match(care, /atlas-care-direct-search/);
  assert.match(care, /ATLAS_PATIENT_COMPLAINT_GUIDE_ENABLED === "true"/);
  assert.doesNotMatch(care, /atlas-care-complaint-entry/);
  for (const path of [
    "app/care/complaints/page.tsx",
    "app/care/complaints/questions/page.tsx",
    "app/care/complaints/specialties/page.tsx",
  ]) {
    const page = read(path);
    assert.match(page, /ATLAS_PATIENT_COMPLAINT_GUIDE_ENABLED/);
    assert.match(page, /robots: \{ index: false, follow: false \}/);
  }
});

test("private Patient Account combines appointment groups, profile and gated registration", () => {
  assert.match(account, /cancelledAppointments/);
  assert.match(account, /upcomingAppointments/);
  assert.match(account, /historyAppointments/);
  assert.match(account, /patient-account-profile-link/);
  assert.match(account, /patient-account-registration-link/);
  assert.match(account, /signInReady && allowSignup/);
  assert.match(login, /registration \? t\.register : t\.send/);
  assert.match(login, /registration \? t\.verifyRegister : t\.verify/);
  assert.match(login, /cooldownLabel/);
  assert.match(login, /createEphemeralVerificationClient/);
  assert.doesNotMatch(login, /service_role|createAdminClient/);
});

test("all Explore tabs depend on genuinely published Doctor rows", () => {
  assert.match(explore, /search_public_doctors_with_availability/);
  assert.match(explore, /p_limit: 30/);
  assert.match(explore, /p_query: clinicQuery \|\| null/);
  assert.match(explore, /kind === "clinics" \? \(/);
  assert.match(explore, /kind === "locations" \? \(/);
  assert.match(explore, /PatientLocationsExplore/);
  assert.match(explore, /patientSpecialtyDetails\(item\.label, locale\)/);
  assert.match(explore, /publishedSubspecialties\(doctors, item\.label\)/);
  assert.doesNotMatch(explore, /service_role|\.from\("appointments"\)|\.from\("clinic_members"\)/);
});

test("clinical preview has no record storage/transport APIs", () => {
  const preview = read("app/dashboard/clinical-preview/page.tsx");
  assert.match(preview, /preview/i);
  assert.doesNotMatch(preview, /createAdminClient|supabase\.from\(|service_role|localStorage|sessionStorage/);
  assert.match(read("app/care/complaints/complaint-screen.tsx"), /ShortSymptomQuestions/);
  assert.match(read("app/care/complaints/complaint-screen.tsx"), /SuggestedSpecialtyCards/);
});
