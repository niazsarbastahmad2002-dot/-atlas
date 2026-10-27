// CI-only: real locally running Supabase GoTrue + PostgREST + actual Atlas routes.
// No mocks for OTP/JWT/session validation. Database schema and rate limiter use
// a minimal disposable fixture; production Supabase and real SMS are untouched.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const api = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const db = process.env.ATLAS_LOCAL_DB_URL;
const web = "http://127.0.0.1:3106";
assert.equal(api, "http://127.0.0.1:54321", "Refuse any nonlocal Supabase project");
assert.ok(publishable && service && db && db.includes("@127.0.0.1:54322/"), "Local-only keys/database required");
assert.equal(process.env.ATLAS_PATIENT_REGISTRATION_ENABLED, "false", "Signup must remain disabled in Atlas");

const clientOptions = { auth: { autoRefreshToken: false, persistSession: false } };
const admin = createClient(api, service, clientOptions);
const anon = createClient(api, publishable, clientOptions);
const patients = [
  { phone: "+9647500000011", code: "231451", mine: "QA Alpha Clinic Exclusive",
    other: "QA Beta Clinic Exclusive", own: "00000000-0000-4000-8000-00000000a300", foreign: "00000000-0000-4000-8000-00000000b300", locale: "en" },
  { phone: "+9647500000022", code: "665432", mine: "QA Beta Clinic Exclusive",
    other: "QA Alpha Clinic Exclusive", own: "00000000-0000-4000-8000-00000000b300", foreign: "00000000-0000-4000-8000-00000000a300", locale: "ku" },
];
let assertions = 0;

function verified(condition, message) {
  assert.ok(condition, message);
  assertions += 1;
}
function cookieFrom(response) {
  const value = response.headers.get("set-cookie") ?? "";
  verified(/atlas_patient_account=[a-f0-9]{64}/.test(value), "Opaque patient cookie required");
  verified(/httponly/i.test(value) && /samesite=lax/i.test(value), "Secure session cookie attributes required");
  verified(/path=\/patient-account/i.test(value), "Patient-only cookie path required");
  return value.split(";")[0];
}
async function requestSite(path, init = {}) {
  const u = new URL(path, web);
  verified(u.origin === web, "No external HTTP target");
  return fetch(u, { redirect: "manual", ...init });
}
function runSeed(a, b) {
  for (const id of [a, b]) verified(/^[a-f0-9-]{36}$/.test(id), "Synthetic UUID only");
  const result = spawnSync("psql", [db, "-v", "ON_ERROR_STOP=1",
    "-v", "user_a=" + a, "-v", "user_b=" + b,
    "-f", "tests/isolated-patient-auth/seed.sql"], { encoding: "utf8" });
  if (result.status !== 0) throw new Error("Local synthetic seed failed: " + (result.stderr || "").slice(0, 600));
  assertions += 1;
}
async function denyDirectRpc(token, otherUuid) {
  for (const [path, method, body] of [
    ["/rest/v1/rpc/list_patient_account_appointments_service", "POST", { p_user_id: otherUuid }],
    ["/rest/v1/rpc/issue_patient_account_appointment_token_service", "POST", {
      p_user_id: otherUuid, p_appointment_id: patients[0].own,
      p_token_hash: "d".repeat(64), p_expires_at: new Date(Date.now() + 1800000).toISOString(),
    }],
  ]) {
    const response = await fetch(api + path, {
      method, headers: { apikey: publishable, authorization: "Bearer " + token, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    verified(!response.ok, "Client JWT must not call service-only RPC: " + path);
  }
}
async function run() {
  const start = await requestSite("/patient-register?lang=en");
  const disabledHtml = await start.text();
  verified(start.status === 200 && disabledHtml.includes("patient-register-unavailable"), "Patient registration OFF");
  verified(!disabledHtml.includes('<form class="patient-account-login-form"'), "No public registration form");

  for (const p of patients) {
    const { data, error } = await admin.auth.admin.createUser({ phone: p.phone, phone_confirm: true });
    verified(!error && data?.user?.id, "Create synthetic local Auth user");
    p.userId = data.user.id;
  }
  verified(patients[0].userId !== patients[1].userId, "Separate Auth identities");
  runSeed(patients[0].userId, patients[1].userId);

  for (const p of patients) {
    // This is real GoTrue OTP transport/verification, configured NOT to send an SMS.
    const { error: sendError } = await anon.auth.signInWithOtp({ phone: p.phone,
      options: { shouldCreateUser: false } });
    verified(!sendError, "Local OTP issue must succeed without messaging");
    const { data, error: verifyError } = await anon.auth.verifyOtp({ phone: p.phone, token: p.code, type: "sms" });
    verified(!verifyError && data?.session?.access_token, "Real local Auth OTP verification required");
    verified(data.user?.id === p.userId, "OTP must authenticate the intended person only");
    p.jwt = data.session.access_token;
    const authMe = await fetch(api + "/auth/v1/user", { headers: {
      apikey: publishable, authorization: "Bearer " + p.jwt } });
    verified(authMe.status === 200 && (await authMe.json()).id === p.userId, "JWT validated by Auth HTTP");
    await denyDirectRpc(p.jwt, patients.find(x => x !== p).userId);
    const session = await requestSite("/patient-account/api/session", {
      method: "POST", headers: { authorization: "Bearer " + p.jwt } });
    verified(session.status === 200 && (await session.json()).status === "ok", "Actual Atlas patient session HTTP POST");
    p.cookie = cookieFrom(session);
  }
  verified(patients[0].cookie !== patients[1].cookie, "Distinct opaque patient session cookies");
  for (const p of patients) {
    for (const locale of ["en", "ku", "bd", "ar"]) {
      const page = await requestSite("/patient-account?lang=" + locale, { headers: { cookie: p.cookie } });
      const html = await page.text();
      verified(page.status === 200 && html.includes(p.mine), "Patient may see only own clinic (" + locale + ")");
      verified(!html.includes(p.other), "CROSS-TENANT LEAK: foreign clinic (" + locale + ")");
    }
    const anonymous = await requestSite("/patient-account?lang=en");
    const anonymousHtml = await anonymous.text();
    verified(!anonymousHtml.includes(p.mine), "Anonymous access must not show appointments");
    const foreignManage = await requestSite("/patient-account/api/appointments/" + p.foreign + "/manage?lang=" + p.locale, {
      method: "POST", headers: { cookie: p.cookie } });
    const foreignRedirect = new URL(foreignManage.headers.get("location") || "/", web);
    verified(foreignManage.status === 303 && foreignRedirect.pathname === "/patient-account"
      && foreignRedirect.searchParams.get("error") === "manage_failed",
      "CROSS-TENANT manage must fail with no private token");
    const ownManage = await requestSite("/patient-account/api/appointments/" + p.own + "/manage?lang=" + p.locale, {
      method: "POST", headers: { cookie: p.cookie } });
    const ownRedirect = new URL(ownManage.headers.get("location") || "/", web);
    verified(ownManage.status === 303 && /^\/patient\/[a-f0-9]{64}$/.test(ownRedirect.pathname),
      "Owner must be able to manage their own appointment");
  }
  // A token from patient A cannot forge the other patient's session.
  const invalid = await requestSite("/patient-account?lang=en", {
    headers: { cookie: "atlas_patient_account=" + "0".repeat(64) },
  });
  verified(!(await invalid.text()).includes(patients[0].mine), "Forged cookie cannot retrieve patient appointments");
  console.log("PASS: " + assertions + " real local Auth + HTTP session/tenant isolation assertions (two patients, two clinics, 4 locales)");
  console.log("All phone numbers, sessions and appointments were synthetic and localhost-only. No external SMS or hosted Supabase.");
}
await run();
