import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = source("supabase/migrations/20261004160000_patient_account_portal.sql");

test("patient account sessions are opaque, private, short-lived, and client denied", () => {
  assert.match(migration, /create table private\.patient_account_sessions/);
  assert.match(migration, /token_hash text not null unique/);
  assert.match(migration, /user_id uuid not null references auth\.users\(id\) on delete cascade/);
  assert.match(migration, /alter table private\.patient_account_sessions enable row level security/);
  assert.match(migration, /revoke all on table private\.patient_account_sessions from public, anon, authenticated/);
  assert.match(migration, /patient_account_sessions_deny_client_access[\s\S]*using \(false\)[\s\S]*with check \(false\)/);
  assert.match(migration, /p_expires_at > now\(\) \+ interval '8 days'/);
});

test("patient account service functions remain service-role only", () => {
  for (const name of [
    "create_patient_account_session_service",
    "resolve_patient_account_session_service",
    "revoke_patient_account_session_service",
    "list_patient_account_appointments_service",
    "issue_patient_account_appointment_token_service",
  ]) {
    assert.match(migration, new RegExp(`revoke all on function public\\.${name}[\\s\\S]*from public, anon, authenticated`, "i"));
    assert.match(migration, new RegExp(`grant execute on function public\\.${name}[\\s\\S]*to service_role`, "i"));
  }
});

test("My Appointments only reads account-owned appointment snapshots through a server RPC", () => {
  const page = source("app/patient-account/page.tsx");
  assert.match(page, /resolvePatientAccountSession/);
  assert.match(page, /admin\.rpc\("list_patient_account_appointments_service"/);
  assert.doesNotMatch(page, /\.from\("appointments"\)/);
  assert.doesNotMatch(page, /patient_phone|patient_name/);
  assert.match(page, /robots: \{ index: false, follow: false \}/);
});

test("Manage appointment mints a fresh short-lived existing patient link after ownership recheck", () => {
  const route = source("app/patient-account/api/appointments/[appointmentId]/manage/route.ts");
  assert.match(route, /resolvePatientAccountSession/);
  assert.match(route, /issue_patient_account_appointment_token_service/);
  assert.match(route, /30 \* 60 \* 1000/);
  assert.match(route, /createPatientToken\(\)/);
  assert.match(route, /\/patient\/\$\{patientToken\}/);
  assert.doesNotMatch(route, /update private\.patient_appointment_tokens|revoke/i);
});

test("patient account login uses ephemeral phone verification and a separate HttpOnly cookie", () => {
  const login = source("app/patient-account/login-form.tsx");
  const session = source("app/patient-account/api/session/route.ts");
  const helper = source("lib/patient-account-session.ts");
  assert.match(login, /createEphemeralVerificationClient\(\)/);
  assert.match(login, /\/patient-account\/api\/session/);
  assert.match(session, /admin\.auth\.getUser\(token\)/);
  assert.match(helper, /atlas_patient_account/);
  assert.match(helper, /httpOnly: true/);
  assert.match(helper, /path: "\/patient-account"/);
  assert.doesNotMatch(helper, /sb-|supabase-auth-token/);
});

test("verified self-booking may create patient portal continuity without making booking depend on it", () => {
  const route = source("app/api/care/booking/finalize/route.ts");
  assert.match(route, /issuePatientAccountSession\(admin, user\.id\)/);
  assert.match(route, /setPatientAccountCookie\(bookingResponse/);
  assert.match(route, /patient account session was not issued after booking/);
  assert.match(route, /return bookingResponse/);
});

test("home exposes My Appointments without replacing care discovery or clinic workspace", () => {
  const home = source("app/page.tsx");
  assert.match(home, /href="\/patient-account"/);
  assert.match(home, /patientAccount: "My appointments"/);
  assert.match(home, /href="\/care"/);
  assert.match(home, /href="\/dashboard"/);
});


test("existing verified patients can sign in even when new phone signup is closed", () => {
  const page = source("app/patient-account/page.tsx");
  const login = source("app/patient-account/login-form.tsx");

  assert.match(page, /readiness\?\.reachable[\s\S]*readiness\.supabasePhoneEnabled/);
  assert.doesNotMatch(page, /signInReady[\s\S]{0,180}openPhoneSignupEnabled/);
  assert.match(page, /allowSignup[\s\S]*openPhoneSignupEnabled[\s\S]*!readiness\.signupDisabled/);
  assert.match(login, /shouldCreateUser: allowSignup/);
});

test("appointment RPC failures are never rendered as an authoritative empty account", () => {
  const page = source("app/patient-account/page.tsx");
  assert.match(page, /let appointmentsFailed = false/);
  assert.match(page, /if \(error \|\| !Array\.isArray\(data\)\) appointmentsFailed = true/);
  assert.match(page, /appointmentsFailed \? \([\s\S]*notice notice-error[\s\S]*loadFailed/);
});
