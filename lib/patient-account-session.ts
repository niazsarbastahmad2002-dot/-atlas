import { createHash, randomBytes } from "node:crypto";
import type { NextResponse } from "next/server";
import type { createAdminClient } from "@/lib/supabase/admin";

export const patientAccountCookieName = "atlas_patient_account";
const patientAccountTokenPattern = /^[a-f0-9]{64}$/;
const patientAccountSessionDays = 7;

type AdminClient = ReturnType<typeof createAdminClient>;

export function createPatientAccountToken() {
  return randomBytes(32).toString("hex");
}

export function isPatientAccountToken(value: string | undefined | null) {
  return typeof value === "string" && patientAccountTokenPattern.test(value);
}

export function hashPatientAccountToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function issuePatientAccountSession(admin: AdminClient, userId: string) {
  const token = createPatientAccountToken();
  const tokenHash = hashPatientAccountToken(token);
  const expiresAt = new Date(Date.now() + patientAccountSessionDays * 24 * 60 * 60 * 1000);

  const { data, error } = await admin.rpc("create_patient_account_session_service", {
    p_verified_user_id: userId,
    p_token_hash: tokenHash,
    p_expires_at: expiresAt.toISOString(),
  });

  if (error || data !== true) return null;
  return { token, expiresAt };
}

export async function resolvePatientAccountSession(admin: AdminClient, token: string) {
  if (!isPatientAccountToken(token)) return null;
  const { data, error } = await admin.rpc("resolve_patient_account_session_service", {
    p_token_hash: hashPatientAccountToken(token),
  });
  if (error || !Array.isArray(data) || !data[0]) return null;
  return data[0];
}

export async function revokePatientAccountSession(admin: AdminClient, token: string) {
  if (!isPatientAccountToken(token)) return false;
  const { data, error } = await admin.rpc("revoke_patient_account_session_service", {
    p_token_hash: hashPatientAccountToken(token),
  });
  return !error && data === true;
}

export function setPatientAccountCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date,
) {
  response.cookies.set(patientAccountCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/patient-account",
    expires: expiresAt,
  });
}

export function clearPatientAccountCookie(response: NextResponse) {
  response.cookies.set(patientAccountCookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/patient-account",
    maxAge: 0,
  });
}
