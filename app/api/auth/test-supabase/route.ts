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

  // Meta's official test WABA cannot currently create Atlas's proper
  // AUTHENTICATION template. The Preview therefore uses a free-form OTP only
  // inside a customer-service window that the tester has just opened by
  // messaging the Meta test number. Do not let the browser advance to the code
  // screen unless that Preview-only precondition was explicitly confirmed.
  if (
    action === "otp"
    && process.env.NEXT_PUBLIC_ATLAS_DIRECT_META_OTP_ENABLED === "true"
    && request.headers.get("x-atlas-meta-test-window-confirmed") !== "true"
  ) {
    return NextResponse.json(
      {
        message: "Open the Meta test WhatsApp conversation before requesting a code.",
        code: "meta_test_conversation_window_required",
      },
      { status: 409, headers: { "cache-control": "no-store" } },
    );
  }

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
