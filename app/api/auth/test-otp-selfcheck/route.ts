import { NextResponse } from "next/server";
import { readAtlasSupabasePublicConfig } from "@/lib/supabase/runtime-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VERIFIED_TEST_RECIPIENT = "+9647518961148";

export async function GET() {
  if (
    process.env.VERCEL_ENV === "production"
    || process.env.ATLAS_WHATSAPP_MODE !== "meta_test"
    || process.env.NEXT_PUBLIC_ATLAS_TEST_SUPABASE_ENABLED !== "true"
  ) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const config = readAtlasSupabasePublicConfig();
  if (!config.isolatedTest || !config.url || !config.publishableKey) {
    return NextResponse.json({ error: "test_supabase_not_configured" }, { status: 503 });
  }

  const response = await fetch(`${config.url.replace(/\/$/, "")}/auth/v1/otp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: config.publishableKey,
      authorization: `Bearer ${config.publishableKey}`,
    },
    body: JSON.stringify({
      phone: VERIFIED_TEST_RECIPIENT,
      create_user: true,
      channel: "sms",
    }),
    cache: "no-store",
  });

  let detail: unknown = null;
  try { detail = await response.json(); } catch {}

  return NextResponse.json({
    accepted: response.ok,
    supabaseStatus: response.status,
    detail: response.ok ? null : detail,
  }, {
    status: response.ok ? 200 : 502,
    headers: { "Cache-Control": "no-store" },
  });
}
