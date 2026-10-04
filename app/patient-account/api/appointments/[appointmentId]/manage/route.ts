import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isUuid } from "@/lib/appointments";
import { createPatientToken, hashPatientToken } from "@/lib/patient-links";
import { createPatientAccountContinuityMarker } from "@/lib/patient-account-continuity";
import {
  patientAccountCookieName,
  resolvePatientAccountSession,
} from "@/lib/patient-account-session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ appointmentId: string }> },
) {
  const { appointmentId } = await context.params;
  const locale = request.nextUrl.searchParams.get("lang") ?? "en";
  const accountUrl = new URL("/patient-account", request.url);
  accountUrl.searchParams.set("lang", locale);

  if (!isUuid(appointmentId)) {
    accountUrl.searchParams.set("error", "manage_failed");
    return NextResponse.redirect(accountUrl, 303);
  }

  const accountToken = request.cookies.get(patientAccountCookieName)?.value ?? "";
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    accountUrl.searchParams.set("error", "manage_failed");
    return NextResponse.redirect(accountUrl, 303);
  }

  const session = await resolvePatientAccountSession(admin, accountToken);
  if (!session) {
    accountUrl.searchParams.set("notice", "session_expired");
    return NextResponse.redirect(accountUrl, 303);
  }

  const bucketHash = createHash("sha256")
    .update(`patient-account-manage:${session.user_id}`)
    .digest("hex");
  const { data: allowed, error: limitError } = await admin.rpc(
    "consume_patient_link_rate_limit",
    { p_bucket_hash: bucketHash },
  );
  if (limitError || allowed !== true) {
    accountUrl.searchParams.set("error", "rate_limited");
    return NextResponse.redirect(accountUrl, 303);
  }

  const patientToken = createPatientToken();
  const tokenHash = hashPatientToken(patientToken);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const { data: issued, error } = await admin.rpc(
    "issue_patient_account_appointment_token_service",
    {
      p_user_id: session.user_id,
      p_appointment_id: appointmentId,
      p_token_hash: tokenHash,
      p_expires_at: expiresAt,
    },
  );

  if (error || issued !== true) {
    accountUrl.searchParams.set("error", "manage_failed");
    return NextResponse.redirect(accountUrl, 303);
  }

  const patientUrl = new URL(`/patient/${patientToken}`, request.url);
  patientUrl.searchParams.set("lang", locale);
  patientUrl.searchParams.set("account", createPatientAccountContinuityMarker(patientToken));
  return NextResponse.redirect(patientUrl, 303);
}
