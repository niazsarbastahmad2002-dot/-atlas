import { NextResponse } from "next/server";
import { readAtlasWhatsAppRuntime, ATLAS_WHATSAPP_META_TEST_MODE } from "@/lib/reminders/whatsapp-runtime";
import { readAtlasSupabasePublicConfig } from "@/lib/supabase/runtime-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeCode(payload: string) {
  try {
    const parsed = JSON.parse(payload) as { code?: unknown; error_code?: unknown };
    const value = typeof parsed.code === "string"
      ? parsed.code
      : typeof parsed.error_code === "string"
        ? parsed.error_code
        : "upstream_error";
    return value.slice(0, 120);
  } catch {
    return "upstream_error";
  }
}

export async function GET() {
  // Temporary internal test route. It is impossible to run in production and
  // can only target a recipient already narrowed by Atlas's Meta test allowlist.
  if (process.env.VERCEL_ENV === "production" || process.env.ATLAS_WHATSAPP_MODE !== ATLAS_WHATSAPP_META_TEST_MODE) {
    return NextResponse.json({ ok: false, code: "not_found" }, { status: 404 });
  }

  let runtimeConfig;
  try {
    runtimeConfig = readAtlasWhatsAppRuntime();
  } catch {
    return NextResponse.json({ ok: false, code: "whatsapp_test_not_configured" }, { status: 503 });
  }
  if (!runtimeConfig || runtimeConfig.mode !== ATLAS_WHATSAPP_META_TEST_MODE || !runtimeConfig.allowedRecipients?.length) {
    return NextResponse.json({ ok: false, code: "test_recipient_not_configured" }, { status: 503 });
  }

  const supabase = readAtlasSupabasePublicConfig();
  if (!supabase.isolatedTest || !supabase.url || !supabase.publishableKey) {
    return NextResponse.json({ ok: false, code: "test_auth_not_configured" }, { status: 503 });
  }

  const recipient = runtimeConfig.allowedRecipients[0];
  const response = await fetch(`${supabase.url.replace(/\/$/, "")}/auth/v1/otp`, {
    method: "POST",
    headers: {
      apikey: supabase.publishableKey,
      "content-type": "application/json",
      "x-client-info": "atlas-whatsapp-self-check/1.0",
    },
    body: JSON.stringify({ phone: recipient, create_user: true }),
    cache: "no-store",
    redirect: "manual",
  });
  const payload = await response.text();

  console.info("Atlas WhatsApp OTP self-check completed", {
    upstreamStatus: response.status,
    upstreamCode: response.ok ? "ok" : safeCode(payload),
  });

  return NextResponse.json({
    ok: response.ok,
    upstreamStatus: response.status,
    code: response.ok ? "ok" : safeCode(payload),
  }, {
    status: response.ok ? 200 : 502,
    headers: { "cache-control": "no-store" },
  });
}
