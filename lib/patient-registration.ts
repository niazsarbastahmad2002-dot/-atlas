import type { AtlasAuthReadiness } from "./auth-readiness";

type PatientRegistrationReadiness = Pick<
  AtlasAuthReadiness,
  "reachable" | "supabasePhoneEnabled" | "openPhoneSignupEnabled" | "signupDisabled"
>;

// UI availability only. The existing phone OTP and patient session endpoints
// remain responsible for verified identity and account access.
export function canRegisterPatient(readiness: PatientRegistrationReadiness): boolean {
  return readiness.reachable
    && readiness.supabasePhoneEnabled
    && readiness.openPhoneSignupEnabled
    && !readiness.signupDisabled;
}
