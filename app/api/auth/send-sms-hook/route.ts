import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  readSupabaseSendSmsHookValues,
  type SupabaseSendSmsHookPayload,
  verifySupabaseSendSmsHook,
} from "@/lib/auth/send-sms-hook";
import {
  atlasWhatsAppRecipientAllowed,
  ATLAS_WHATSAPP_META_TEST_MODE,
  readAtlasWhatsAppRuntime,
} from "@/lib/reminders/whatsapp-runtime";
import {
  readBodyWithLimit,
  sendWhatsAppAuthenticationTemplate,
  sendWhatsAppTextMessage,
} from "@/lib/reminders/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function constantTimeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function readPreviewAutomationBypass(request: Request) {
  const expected = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() ?? "";
  if (expected.length < 24) return false;

  const url = new URL(request.url);
  const provided = (
    url.searchParams.get("x-vercel-protection-bypass")
    ?? request.headers.get("x-vercel-protection-bypass")
    ?? ""
  ).trim();
  return provided.length >= 24 && constantTimeEqual(provided, expected);
}

function parseHookPayload(rawBody: string): SupabaseSendSmsHookPayload | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const payload = parsed as Partial<SupabaseSendSmsHookPayload>;
  if (!payload.user || typeof payload.user !== "object") return null;
  if (!payload.sms || typeof payload.sms !== "object") return null;
  return payload as SupabaseSendSmsHookPayload;
}

function safePayloadShape(payload: SupabaseSendSmsHookPayload) {
  const user = payload.user as Record<string, unknown>;
  const sms = payload.sms as Record<string, unknown>;
  const phone = user.phone ?? user.new_phone;
  const otp = sms.otp;
  return {
    userKeys: Object.keys(user).sort().slice(0, 30),
    smsKeys: Object.keys(sms).sort().slice(0, 30),
    phoneType: typeof phone,
    phoneLength: typeof phone === "string" ? phone.length : null,
    phoneStartsWithPlus: typeof phone === "string" ? phone.trim().startsWith("+") : null,
    otpType: typeof otp,
    otpLength: typeof otp === "string" ? otp.trim().length : null,
  };
}

export async function POST(request: Request) {
  const hookSecret = process.env.SUPABASE_SEND_SMS_HOOK_SECRET?.trim() ?? "";
  if (hookSecret.length < 24) {
    return NextResponse.json({ error: "service_not_configured" }, { status: 503 });
  }

  let runtimeConfig;
  try {
    runtimeConfig = readAtlasWhatsAppRuntime();
  } catch {
    return NextResponse.json({ error: "service_not_configured" }, { status: 503 });
  }
  const testMode = runtimeConfig?.mode === ATLAS_WHATSAPP_META_TEST_MODE;
  if (!runtimeConfig || (!testMode && process.env.WHATSAPP_DIRECT_OTP_ENABLED !== "true")) {
    return NextResponse.json({ error: "service_not_configured" }, { status: 503 });
  }

  const bodyBytes = await readBodyWithLimit(request.body, 100_000);
  if (!bodyBytes) return NextResponse.json({ error: "request_too_large" }, { status: 413 });
  const rawBody = new TextDecoder().decode(bodyBytes);

  let payload = verifySupabaseSendSmsHook(rawBody, request.headers, hookSecret);

  // Isolated Preview-only fallback: Vercel's automation-bypass secret already
  // gates this exact protected endpoint. This lets the official Supabase test
  // hook proceed when Standard Webhooks verification is out of sync, without
  // weakening production or accepting arbitrary unsigned requests.
  if (!payload && testMode && process.env.VERCEL_ENV !== "production" && readPreviewAutomationBypass(request)) {
    payload = parseHookPayload(rawBody);
    if (payload) console.warn("Atlas test Send SMS Hook used verified Preview automation bypass fallback");
  }

  if (!payload) {
    console.warn("Atlas Send SMS Hook rejected request", {
      testMode,
      vercelEnv: process.env.VERCEL_ENV ?? "unknown",
      hasWebhookId: Boolean(request.headers.get("webhook-id")),
      hasWebhookTimestamp: Boolean(request.headers.get("webhook-timestamp")),
      hasWebhookSignature: Boolean(request.headers.get("webhook-signature")),
      hasPreviewBypass: readPreviewAutomationBypass(request),
    });
    return NextResponse.json({ error: "invalid_hook_signature" }, { status: 403 });
  }

  const values = readSupabaseSendSmsHookValues(payload);
  if (!values || !atlasWhatsAppRecipientAllowed(runtimeConfig, values.phone)) {
    console.warn("Atlas Send SMS Hook rejected recipient", {
      hasValidPayload: Boolean(values),
      recipientAllowed: values ? atlasWhatsAppRecipientAllowed(runtimeConfig, values.phone) : null,
      testMode,
      ...(testMode && process.env.VERCEL_ENV !== "production" ? safePayloadShape(payload) : {}),
    });
    return NextResponse.json({ error: "recipient_not_allowed" }, { status: 403 });
  }

  let result = await sendWhatsAppAuthenticationTemplate(
    values.phone,
    values.otp,
    runtimeConfig.otpTemplateName,
    runtimeConfig.config,
  );

  // Meta test WABAs may not be eligible to create AUTHENTICATION templates.
  // Inside the official 24-hour test conversation window only, use a plain
  // text transport fallback while Supabase remains the OTP authority. Never
  // use this fallback for the production sender. Meta API acceptance is logged
  // as acceptance only; it is not treated as proof of handset delivery.
  if (!result.accepted && testMode) {
    const templateErrorCode = result.errorCode;
    result = await sendWhatsAppTextMessage(
      values.phone,
      `Atlas test verification code: ${values.otp}. It expires soon.`,
      runtimeConfig.config,
    );
    console.info("Atlas test OTP fallback result", {
      templateErrorCode,
      fallbackAccepted: result.accepted,
      providerMessageId: result.accepted ? result.providerMessageId : null,
      fallbackErrorCode: result.accepted ? null : result.errorCode,
    });
  }

  if (!result.accepted) {
    console.warn("Atlas Send SMS Hook WhatsApp delivery failed", {
      testMode,
      code: result.errorCode,
      retryable: result.retryable,
    });
    return NextResponse.json({
      error: "delivery_failed",
      code: result.errorCode,
    }, { status: result.retryable ? 503 : 502 });
  }

  return NextResponse.json({}, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
