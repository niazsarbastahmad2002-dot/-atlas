import { NextResponse } from "next/server";
import {
  readSupabaseSendSmsHookValues,
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
  const payload = verifySupabaseSendSmsHook(rawBody, request.headers, hookSecret);
  if (!payload) return NextResponse.json({ error: "invalid_hook_signature" }, { status: 403 });

  const values = readSupabaseSendSmsHookValues(payload);
  if (!values || !atlasWhatsAppRecipientAllowed(runtimeConfig, values.phone)) {
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
  // use this fallback for the production sender.
  if (!result.accepted && testMode) {
    result = await sendWhatsAppTextMessage(
      values.phone,
      `Atlas test verification code: ${values.otp}. It expires soon.`,
      runtimeConfig.config,
    );
  }

  if (!result.accepted) {
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
