import { NextResponse } from "next/server";
import {
  ATLAS_WHATSAPP_META_TEST_MODE,
  readAtlasWhatsAppRuntime,
} from "@/lib/reminders/whatsapp-runtime";
import { sendWhatsAppTextMessage } from "@/lib/reminders/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (
    process.env.VERCEL_ENV === "production"
    || process.env.ATLAS_WHATSAPP_MODE !== ATLAS_WHATSAPP_META_TEST_MODE
    || process.env.NEXT_PUBLIC_ATLAS_TEST_SUPABASE_ENABLED !== "true"
  ) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let runtimeConfig;
  try {
    runtimeConfig = readAtlasWhatsAppRuntime();
  } catch {
    return NextResponse.json({ error: "service_not_configured" }, { status: 503 });
  }

  if (!runtimeConfig || runtimeConfig.mode !== ATLAS_WHATSAPP_META_TEST_MODE) {
    return NextResponse.json({ error: "service_not_configured" }, { status: 503 });
  }

  const recipient = runtimeConfig.allowedRecipients?.[0];
  if (!recipient) {
    return NextResponse.json({ error: "test_recipient_not_configured" }, { status: 503 });
  }

  const result = await sendWhatsAppTextMessage(
    recipient,
    "Atlas WhatsApp window check: delivery path is live.",
    runtimeConfig.config,
  );

  return NextResponse.json({
    accepted: result.accepted,
    retryable: result.retryable,
    errorCode: result.errorCode ?? null,
    messageId: result.accepted ? result.messageId ?? null : null,
  }, {
    status: result.accepted ? 200 : result.retryable ? 503 : 502,
    headers: { "Cache-Control": "no-store" },
  });
}
