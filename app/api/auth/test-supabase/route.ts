import { NextResponse } from "next/server";
import { readAtlasSupabasePublicConfig } from "@/lib/supabase/runtime-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedActions = new Set(["otp", "verify"]);
const MAX_BODY_BYTES = 20_000;

function safeErrorCode(payload: string) {
  try {
    const parsed = JSON.parse(payload) as { code?: unknown; error_code?: unknown };
    const candidate = typeof parsed.code === "string"
      ? parsed.code
      : typeof parsed.error_code === "string"
        ? parsed.error_code
        : "upstream_error";
    return candidate.slice(0, 120);
  } catch {
    return "upstream_error";
  }
}

export async function POST(request: Request) {
  // This proxy exists only to make the isolated Meta/Supabase Preview test
  // deterministic. Production auth continues to use the normal Supabase path.
  if (process.env.VERCEL_ENV === "production" || process.env.ATLAS_WHATSAPP_MODE !== "meta_test") {
    return NextResponse.json({ message: "Not found", code: "not_found" }, { status: 404 });
  }

  const action = new URL(request.url).searchParams.get("path") ?? "";
  if (!allowedActions.has(action)) {
    return NextResponse.json({ message: "Unsupported auth action", code: "unsupported_action" }, { status: 400 });
  }

  const config = readAtlasSupabasePublicConfig();
  if (!config.isolatedTest || !config.url || !config.publishableKey) {
    return NextResponse.json({ message: "Test auth is not configured", code: "test_auth_not_configured" }, { status: 503 });
  }

  // Do not gate the isolated OTP relay on a browser-local confirmation flag.
  // The Meta test customer-service window is an external WhatsApp state and can
  // already be open even when this browser has no localStorage marker. Delivery
  // failures are handled by the Preview-only Send SMS Hook/Meta path instead.
  // Production remains hard-blocked above and never uses this relay.

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ message: "Request too large", code: "request_too_large" }, { status: 413 });
  }

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
    return NextResponse.json({ message: "Request too large", code: "request_too_large" }, { status: 413 });
  }

  const upstreamUrl = `${config.url.replace(/\/$/, "")}/auth/v1/${action}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        apikey: config.publishableKey,
        "content-type": request.headers.get("content-type") ?? "application/json",
        "x-client-info": "atlas-isolated-auth-proxy/1.0",
      },
      body,
      cache: "no-store",
      redirect: "manual",
    });

    const payload = await upstream.text();
    if (!upstream.ok) {
      console.warn("Atlas isolated Supabase auth request failed", {
        action,
        status: upstream.status,
        code: safeErrorCode(payload),
      });
    }

    return new NextResponse(payload || (upstream.ok ? "{}" : ""), {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    });
  } catch {
    console.error("Atlas isolated Supabase auth proxy could not reach upstream", { action });
    return NextResponse.json(
      { message: "Verification service unavailable", code: "verification_service_unavailable" },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
