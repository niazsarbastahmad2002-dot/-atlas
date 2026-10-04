import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isUiLocale } from "@/lib/i18n/ui";
import {
  patientAccountCookieName,
  resolvePatientAccountSession,
} from "@/lib/patient-account-session";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function redirectToAccount(
  request: NextRequest,
  locale: string,
  key: "error" | "notice",
  value: string,
) {
  const destination = new URL("/patient-account", request.url);
  destination.searchParams.set("lang", isUiLocale(locale) ? locale : "en");
  destination.searchParams.set(key, value);
  return NextResponse.redirect(destination, 303);
}

function validDisplayName(value: string) {
  return value.length >= 2
    && value.length <= 120
    && value.trim() === value
    && !/[\u0000-\u001f\u007f]/.test(value);
}

export async function POST(request: NextRequest) {
  const queryLocale = request.nextUrl.searchParams.get("lang") ?? "en";
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return redirectToAccount(request, queryLocale, "error", "profile_invalid");
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 4096) {
    return redirectToAccount(request, queryLocale, "error", "profile_invalid");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return redirectToAccount(request, queryLocale, "error", "profile_invalid");
  }

  const displayName = String(formData.get("display_name") ?? "").trim();
  const preferredLanguage = String(formData.get("preferred_language") ?? "");
  const returnLocale = String(formData.get("return_lang") ?? queryLocale);

  if (!validDisplayName(displayName) || !isUiLocale(preferredLanguage)) {
    return redirectToAccount(request, returnLocale, "error", "profile_invalid");
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return redirectToAccount(request, returnLocale, "error", "profile_failed");
  }

  const accountToken = request.cookies.get(patientAccountCookieName)?.value ?? "";
  const session = await resolvePatientAccountSession(admin, accountToken);
  if (!session) {
    return redirectToAccount(request, returnLocale, "notice", "session_expired");
  }

  const bucketHash = createHash("sha256")
    .update(`patient-account-profile:${session.user_id}`)
    .digest("hex");
  const { data: allowed, error: limitError } = await admin.rpc(
    "consume_patient_link_rate_limit",
    { p_bucket_hash: bucketHash },
  );
  if (limitError || allowed !== true) {
    return redirectToAccount(request, returnLocale, "error", "rate_limited");
  }

  const { error } = await admin
    .from("patient_profiles")
    .upsert({
      user_id: session.user_id,
      display_name: displayName,
      preferred_language: preferredLanguage,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "user_id",
    });

  if (error) {
    console.error("Atlas patient account profile save failed", { code: error.code });
    return redirectToAccount(request, returnLocale, "error", "profile_failed");
  }

  return redirectToAccount(request, preferredLanguage, "notice", "profile_saved");
}
