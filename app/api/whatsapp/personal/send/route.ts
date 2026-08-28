import { NextResponse } from "next/server";
import {
  atlasWhatsAppRecipientAllowed,
  ATLAS_WHATSAPP_META_TEST_MODE,
  readAtlasWhatsAppRuntime,
} from "@/lib/reminders/whatsapp-runtime";
import { sendWhatsAppTextMessage } from "@/lib/reminders/whatsapp";
import { constantTimeEqual } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PersonalSendRequest = {
  recipientPhone?: unknown;
  message?: unknown;
};

function authorized(request: Request) {
  const header = request.headers.get("authorization");
  const secret = process.env.WHATSAPP_PERSONAL_TOOL_SECRET?.trim();
  return Boolean(
    header?.startsWith("Bearer ")
    && secret
    && secret.length >= 32
    && constantTimeEqual(header.slice(7), secret),
  );
}

export async function POST(request: Request) {
  // Personal ChatGPT sending is intentionally Preview/test-only until a
  // dedicated permanent sender is explicitly approved. Never let this route
  // select or use the production Atlas WhatsApp sender by accident.
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "personal_sender_forbidden_in_production" }, { status: 403 });
  }
  if (process.env.WHATSAPP_PERSONAL_TOOL_ENABLED !== "true") {
    return NextResponse.json({ error: "personal_sender_disabled" }, { status: 503 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let runtimeConfig;
  try {
    runtimeConfig = readAtlasWhatsAppRuntime();
  } catch {
    return NextResponse.json({ error: "service_not_configured" }, { status: 503 });
  }
  if (!runtimeConfig || runtimeConfig.mode !== ATLAS_WHATSAPP_META_TEST_MODE) {
    return NextResponse.json({ error: "meta_test_mode_required" }, { status: 503 });
  }

  let body: PersonalSendRequest;
  try {
    body = await request.json() as PersonalSendRequest;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const recipientPhone = typeof body.recipientPhone === "string" ? body.recipientPhone.trim() : "";
  const message = typeof body.message === "string" ? body.message : "";

  if (!recipientPhone || !atlasWhatsAppRecipientAllowed(runtimeConfig, recipientPhone)) {
    return NextResponse.json({ error: "recipient_not_allowed" }, { status: 403 });
  }
  if (!message.trim() || message.length > 1000) {
    return NextResponse.json({ error: "invalid_message" }, { status: 400 });
  }

  const result = await sendWhatsAppTextMessage(recipientPhone, message, runtimeConfig.config);
  if (result.accepted) {
    return NextResponse.json({
      accepted: true,
      providerMessageId: result.providerMessageId,
      recipientPhone,
    }, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json({
    accepted: false,
    errorCode: result.errorCode,
    retryable: result.retryable,
  }, {
    status: result.retryable ? 503 : 502,
    headers: { "Cache-Control": "no-store" },
  });
}
