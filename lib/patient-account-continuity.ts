import { createHmac, timingSafeEqual } from "node:crypto";
import { isPatientToken } from "@/lib/patient-links";

const markerPattern = /^[A-Za-z0-9_-]{43}$/;

function patientAccountContinuitySecret() {
  const secret = process.env.SUPABASE_SECRET_KEY?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) throw new Error("Atlas patient account continuity secret is not configured.");
  return secret;
}

export function createPatientAccountContinuityMarker(token: string) {
  if (!isPatientToken(token)) throw new Error("Invalid patient token.");
  return createHmac("sha256", patientAccountContinuitySecret())
    .update(`atlas:patient-account-continuity:v1:${token}`)
    .digest("base64url");
}

export function verifyPatientAccountContinuityMarker(
  token: string,
  marker: string | null | undefined,
) {
  if (!isPatientToken(token) || !marker || !markerPattern.test(marker)) return false;

  let expected: string;
  try {
    expected = createPatientAccountContinuityMarker(token);
  } catch {
    return false;
  }

  const actualBytes = Buffer.from(marker, "ascii");
  const expectedBytes = Buffer.from(expected, "ascii");
  return actualBytes.length === expectedBytes.length
    && timingSafeEqual(actualBytes, expectedBytes);
}
