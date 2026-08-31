import { NextResponse } from "next/server";
import { getAtlasAuthReadiness } from "@/lib/auth-readiness";
import { createAdminClient } from "@/lib/supabase/admin";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isAlreadyRegistered(error: { code?: string; message?: string } | null) {
  const text = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return text.includes("already registered")
    || text.includes("already been registered")
    || text.includes("email_exists")
    || text.includes("user_already_exists");
}

export async function POST(request: Request) {
  const readiness = await getAtlasAuthReadiness();
  if (!readiness.reachable || readiness.supabasePhoneEnabled || !readiness.supabaseEmailEnabled) {
    return NextResponse.json({ ok: false }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  let email = "";
  try {
    const body = await request.json() as { email?: unknown };
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  } catch {
    return NextResponse.json({ ok: false }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  if (!EMAIL_PATTERN.test(email) || email.length > 320) {
    return NextResponse.json({ ok: false }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.createUser({
      email,
      email_confirm: false,
      app_metadata: { atlas_temporary_email_bootstrap: true },
    });

    if (error && !isAlreadyRegistered(error)) {
      console.error("atlas_temporary_email_bootstrap_failed", {
        code: error.code ?? null,
        status: error.status ?? null,
      });
      return NextResponse.json({ ok: false }, { status: 500, headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("atlas_temporary_email_bootstrap_exception", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ ok: false }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
