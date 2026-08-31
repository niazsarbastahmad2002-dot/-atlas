import { NextResponse } from "next/server";
import { getAtlasAuthReadiness } from "@/lib/auth-readiness";
import { createAdminClient } from "@/lib/supabase/admin";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UI_LOCALES = new Set(["en", "ku", "bd", "ar"]);

type TemporaryEmailFailure = "rate_limited" | "not_authorized" | "provider" | "delivery";
type AtlasEmailLocale = "en" | "ku" | "bd" | "ar";

function isAlreadyRegistered(error: { code?: string; message?: string } | null) {
  const text = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return text.includes("already registered")
    || text.includes("already been registered")
    || text.includes("email_exists")
    || text.includes("user_already_exists");
}

function deliveryFailure(code?: string): TemporaryEmailFailure {
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit") return "rate_limited";
  if (code === "email_address_not_authorized") return "not_authorized";
  if (code === "otp_disabled" || code === "email_provider_disabled" || code === "provider_disabled") return "provider";
  return "delivery";
}

function failureResponse(reason: TemporaryEmailFailure, status = 503) {
  return NextResponse.json(
    { ok: false, reason },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const readiness = await getAtlasAuthReadiness();
  if (!readiness.reachable || readiness.supabasePhoneEnabled || !readiness.supabaseEmailEnabled) {
    return failureResponse("provider", 403);
  }

  let email = "";
  let locale: AtlasEmailLocale = "en";
  try {
    const body = await request.json() as { email?: unknown; locale?: unknown };
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (typeof body.locale === "string" && UI_LOCALES.has(body.locale)) {
      locale = body.locale as AtlasEmailLocale;
    }
  } catch {
    return NextResponse.json({ ok: false }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  if (!EMAIL_PATTERN.test(email) || email.length > 320) {
    return NextResponse.json({ ok: false }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const admin = createAdminClient();
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { atlas_ui_language: locale },
      app_metadata: { atlas_temporary_email_bootstrap: true },
    });

    if (createError && !isAlreadyRegistered(createError)) {
      console.error("atlas_temporary_email_bootstrap_failed", {
        code: createError.code ?? null,
        status: createError.status ?? null,
      });
      return failureResponse("delivery");
    }

    const redirectTo = new URL("/auth/callback", request.url);
    redirectTo.searchParams.set("next", "/dashboard/select-clinic");
    redirectTo.searchParams.set("atlas_email_locale", locale);

    const { error: sendError } = await admin.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: redirectTo.toString(),
      },
    });

    if (sendError) {
      const reason = deliveryFailure(sendError.code);
      console.error("atlas_temporary_email_send_failed", {
        code: sendError.code ?? null,
        status: sendError.status ?? null,
        reason,
      });
      return failureResponse(reason, reason === "rate_limited" ? 429 : 503);
    }

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("atlas_temporary_email_bootstrap_exception", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return failureResponse("delivery");
  }
}
