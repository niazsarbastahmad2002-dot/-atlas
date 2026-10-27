import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const care = read("app/care/page.tsx");
const explore = read("app/explore/[kind]/page.tsx");
const clinic = read("app/care/[clinicSlug]/page.tsx");
const times = read("app/care/[clinicSlug]/[doctorSlug]/times/page.tsx");

test("public-only candidate excludes complaints and clinical preview; patient registration stays gated", () => {
  for (const path of [
    "app/care/complaints/page.tsx",
    "app/care/complaints/questions/page.tsx",
    "app/care/complaints/specialties/page.tsx",
    "app/dashboard/clinical-preview/page.tsx",
    "lib/patient/complaint-guide.ts",
  ]) assert.equal(existsSync(join(root, path)), false, path);

  // A separate registration draft may contain this route, but it must remain
  // inaccessible for new accounts without its own explicit default-off gate.
  if (existsSync(join(root, "app/patient-register/page.tsx"))) {
    const registration = read("app/patient-register/page.tsx");
    const registrationGate = read("lib/patient-registration.ts");
    const patientAccount = read("app/patient-account/page.tsx");
    assert.ok(registration.includes("canRegisterPatient(readiness)"));
    assert.ok(registration.includes("signupAvailable ? ("));
    assert.ok(registrationGate.includes('registrationEnabled = process.env.ATLAS_PATIENT_REGISTRATION_ENABLED === "true"'));
    assert.ok(registrationGate.includes("return registrationEnabled"));
    assert.ok(patientAccount.includes("const registrationReady = readiness ? canRegisterPatient(readiness) : false;"));
    assert.ok(patientAccount.includes("registrationReady ? ("));
    assert.ok(!care.includes("/patient-register"));
  }

  assert.ok(!care.includes("/care/complaints"));
  assert.ok(!care.includes("ATLAS_PATIENT_COMPLAINT_GUIDE_ENABLED"));
  assert.ok(care.includes('patientLocaleHref("/explore/specialties", locale)'));
});

test("public discovery depends on published and bounded provider RPC", () => {
  for (const source of [care, explore]) {
    assert.ok(source.includes("search_public_doctors_with_availability"));
    assert.ok(source.includes("p_limit: 30"));
    for (const forbidden of ['.from("appointments")', 'createAdminClient(', "service_role"])
      assert.ok(!source.includes(forbidden), forbidden);
  }
  assert.ok(explore.includes("PatientLocationsExplore"));
  assert.ok(explore.includes("publishedSubspecialties(doctors, item.label)"));
  assert.ok(!explore.includes("patientSpecialtyDetails(item.label, locale)"));
  assert.ok(explore.includes("<bdi>{item.label}</bdi>"));
  assert.ok(!explore.includes("details.about"));
});

test("published availability remains read-only unless existing separate launch gates are ready", () => {
  assert.ok(times.includes("list_public_doctor_slots_page"));
  assert.ok(times.includes("p_days: 14"));
  assert.ok(times.includes('ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED === "true"'));
  assert.ok(times.includes("readiness?.reachable"));
  assert.ok(times.includes("!readiness.signupDisabled"));
  assert.ok(times.includes("atlas-time-option is-readonly"));
  assert.ok(!times.includes('.from("appointments")'));
});

test("clinic directions never manufacture coordinate links or stale map pins", () => {
  assert.ok(clinic.includes("const directionsDestination = clinic.address_text"));
  assert.ok(clinic.includes('destination: directionsDestination'));
  for (const forbidden of ["mapUrl", "hasMapPin", "clinic.latitude", "clinic.longitude"])
    assert.ok(!clinic.includes(forbidden), forbidden);
});

test("four language copies and narrow-screen guide panel remain in Find Care", () => {
  for (const locale of ["en", "ku", "bd", "ar"]) {
    assert.ok(care.includes("  " + locale + ": {"));
    assert.ok(explore.includes("  " + locale + ": {"));
  }
  assert.ok(care.includes(".atlas-care-journey{flex-direction:column;align-items:stretch"));
});
