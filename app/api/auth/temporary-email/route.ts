import { NextResponse } from "next/server";
import { getAtlasAuthReadiness } from "@/lib/auth-readiness";
import { createAdminClient } from "@/lib/supabase/admin";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UI_LOCALES = new Set(["en", "ku", "bd", "ar"]);

type TemporaryEmailFailure = "rate_limited" | "not_authorized" | "provider" | "delivery";
type AtlasEmailLocale = "en" | "ku" | "bd" | "ar";
type AdminClient = ReturnType<typeof createAdminClient>;

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

async function syncExistingUserLocale(
  admin: AdminClient,
  email: string,
  locale: AtlasEmailLocale,
) {
  const perPage = 1000;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("atlas_temporary_email_locale_lookup_failed", {
        code: error.code ?? null,
        status: error.status ?? null,
      });
      return false;
    }

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user) {
      const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...(user.user_metadata ?? {}),
          atlas_ui_language: locale,
        },
      });

      if (updateError) {
        console.error("atlas_temporary_email_locale_update_failed", {
          code: updateError.code ?? null,
          status: updateError.status ?? null,
        });
        return false;
      }

      return true;
    }

    if (data.users.length < perPage) break;
  }

  console.error("atlas_temporary_email_locale_user_not_found");
  return false;
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

    if (createError) {
      if (!isAlreadyRegistered(createError)) {
        console.error("atlas_temporary_email_bootstrap_failed", {
          code: createError.code ?? null,
          status: createError.status ?? null,
        });
        return failureResponse("delivery");
      }

      if (!await syncExistingUserLocale(admin, email, locale)) {
        return failureResponse("delivery");
      }
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
