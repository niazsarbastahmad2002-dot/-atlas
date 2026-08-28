import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { ATLAS_WHATSAPP_META_TEST_MODE, readAtlasWhatsAppRuntime } from "@/lib/reminders/whatsapp-runtime";
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

function authorized(request: Request) {
  const expected = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() ?? "";
  const provided = new URL(request.url).searchParams.get("x-vercel-protection-bypass")?.trim() ?? "";
  if (expected.length < 24 || provided.length < 24) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  // Temporary internal test route. Production is hard-blocked and the route
  // requires the same Preview automation-bypass secret used by the Supabase hook.
  if (process.env.VERCEL_ENV === "production" || process.env.ATLAS_WHATSAPP_MODE !== ATLAS_WHATSAPP_META_TEST_MODE) {
    return NextResponse.json({ ok: false, code: "not_found" }, { status: 404 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, code: "unauthorized" }, { status: 401 });
  }

  let runtimeConfig;
  try {
    runtimeConfig = readAtlasWhatsAppRuntime();
  } catch {
    return NextResponse.json({ ok: false, code: "whatsapp_test_not_configured" }, { status: 503 });
  }
  if (!runtimeConfig || runtimeConfig.mode !== ATLAS_WHATSAPP_META_TEST_MODE) {
    return NextResponse.json({ ok: false, code: "whatsapp_test_not_configured" }, { status: 503 });
  }

  const recipient = new URL(request.url).searchParams.get("recipient")?.trim() ?? "";
  if (!/^\+[1-9]\d{7,14}$/.test(recipient)) {
    return NextResponse.json({ ok: false, code: "invalid_test_recipient" }, { status: 400 });
  }

  const supabase = readAtlasSupabasePublicConfig();
  if (!supabase.isolatedTest || !supabase.url || !supabase.publishableKey) {
    return NextResponse.json({ ok: false, code: "test_auth_not_configured" }, { status: 503 });
  }

  const response = await fetch(`${supabase.url.replace(/\/$/, "")}/auth/v1/otp`, {
    method: "POST",
    headers: {
      apikey: supabase.publishableKey,
      "content-type": "application/json",
      "x-client-info": "atlas-whatsapp-self-check/1.1",
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
