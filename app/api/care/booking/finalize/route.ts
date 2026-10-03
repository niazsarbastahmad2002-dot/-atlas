import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { isUuid } from "@/lib/appointments";
import { createPatientToken, hashPatientToken } from "@/lib/patient-links";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type BookingBody = {
  clinicSlug?: unknown;
  doctorSlug?: unknown;
  slotAt?: unknown;
  patientName?: unknown;
  idempotencyKey?: unknown;
  reminderLanguage?: unknown;
  reminderConsent?: unknown;
};

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const iraqiPhonePattern = /^\+9647\d{9}$/;
const reminderLanguages = new Set(["ku", "bd", "ar", "en"]);

function response(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
  return match?.[1] ?? null;
}

export async function POST(request: Request) {
  if (process.env.ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED !== "true") {
    return response({ status: "not_ready" }, 503);
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 8192) {
    return response({ status: "invalid" }, 413);
  }

  const token = bearerToken(request);
  if (!token) return response({ status: "verification_required" }, 401);

  let body: BookingBody;
  try {
    body = await request.json() as BookingBody;
  } catch {
    return response({ status: "invalid" }, 400);
  }

  const clinicSlug = typeof body.clinicSlug === "string" ? body.clinicSlug : "";
  const doctorSlug = typeof body.doctorSlug === "string" ? body.doctorSlug : "";
  const patientName = typeof body.patientName === "string" ? body.patientName.trim() : "";
  const slotAt = typeof body.slotAt === "string" ? body.slotAt : "";
  const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey : "";
  const reminderLanguage = typeof body.reminderLanguage === "string" ? body.reminderLanguage : "ku";
  const reminderConsent = body.reminderConsent === true;

  const slotDate = new Date(slotAt);
  if (
    !slugPattern.test(clinicSlug) || clinicSlug.length > 80
    || !slugPattern.test(doctorSlug) || doctorSlug.length > 80
    || patientName.length < 2 || patientName.length > 120
    || /[\u0000-\u001f\u007f]/.test(patientName)
    || Number.isNaN(slotDate.getTime()) || slotDate.getTime() <= Date.now()
    || !isUuid(idempotencyKey)
    || !reminderLanguages.has(reminderLanguage)
  ) {
    return response({ status: "invalid" }, 400);
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return response({ status: "not_ready" }, 503);
  }

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData.user;
  const verifiedPhone = user?.phone?.startsWith("+")
    ? user.phone
    : user?.phone
      ? `+${user.phone}`
      : "";
  if (
    userError
    || !user
    || !user.phone_confirmed_at
    || !iraqiPhonePattern.test(verifiedPhone)
  ) {
    return response({ status: "verification_required" }, 401);
  }

  const bucketHash = createHash("sha256")
    .update(`public-booking:${user.id}`)
    .digest("hex");
  const { data: allowed, error: limitError } = await admin.rpc(
    "consume_patient_link_rate_limit",
    { p_bucket_hash: bucketHash },
  );
  if (limitError || allowed !== true) {
    return response({ status: "rate_limited" }, 429);
  }

  const patientToken = createPatientToken();
  const patientTokenHash = hashPatientToken(patientToken);
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin.rpc("finalize_verified_public_booking_service", {
    p_verified_user_id: user.id,
    p_clinic_slug: clinicSlug,
    p_doctor_slug: doctorSlug,
    p_slot_at: slotDate.toISOString(),
    p_patient_name: patientName,
    p_idempotency_key: idempotencyKey,
    p_patient_token_hash: patientTokenHash,
    p_patient_token_expires_at: expiresAt,
    p_reminder_language: reminderLanguage,
    p_reminder_consent: reminderConsent,
  });

  const result = Array.isArray(data) ? data[0] : undefined;
  if (error || !result) {
    console.error("Atlas verified public booking finalization failed", {
      code: error?.code ?? "missing_result",
    });
    return response({ status: "failed" }, 500);
  }

  if ((result.result === "created" || result.result === "duplicate") && result.appointment_id) {
    const lang = reminderLanguages.has(reminderLanguage) ? reminderLanguage : "ku";
    return response({
      status: "ok",
      patientPath: `/patient/${patientToken}?lang=${encodeURIComponent(lang)}`,
    }, 200);
  }

  const clientStatus = new Set(["invalid", "verification_required", "unavailable", "slot_taken", "idempotency_mismatch"]);
  if (clientStatus.has(result.result)) {
    const status = result.result === "verification_required" ? 401 : result.result === "slot_taken" ? 409 : 400;
    return response({ status: result.result }, status);
  }

  return response({ status: "failed" }, 500);
}
