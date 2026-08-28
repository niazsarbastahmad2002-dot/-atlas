import { createHash } from "node:crypto";
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

const PROBE_SUFFIX = ":personal-self-test-v1";
const TEST_MESSAGE = "Atlas personal WhatsApp test: ChatGPT send path is live.";

function expectedProbe() {
  const secret = process.env.WHATSAPP_PERSONAL_TOOL_SECRET?.trim() ?? "";
  if (secret.length < 32) return "";
  return createHash("sha256").update(`${secret}${PROBE_SUFFIX}`).digest("hex");
}

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (process.env.WHATSAPP_PERSONAL_TOOL_ENABLED !== "true") {
    return NextResponse.json({ error: "personal_sender_disabled" }, { status: 503 });
  }

  const url = new URL(request.url);
  const suppliedProbe = url.searchParams.get("probe") ?? "";
  const probe = expectedProbe();
  if (!probe || !constantTimeEqual(suppliedProbe, probe)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let runtimeConfig;
  try {
    runtimeConfig = readAtlasWhatsAppRuntime();
  } catch {
    return NextResponse.json({ error: "transport_not_configured" }, { status: 503 });
  }
  if (!runtimeConfig || runtimeConfig.mode !== ATLAS_WHATSAPP_META_TEST_MODE) {
    return NextResponse.json({ error: "meta_test_required" }, { status: 503 });
  }

  const recipientPhone = url.searchParams.get("to")?.trim() ?? "";
  if (!recipientPhone || !atlasWhatsAppRecipientAllowed(runtimeConfig, recipientPhone)) {
    return NextResponse.json({ error: "recipient_not_allowed" }, { status: 403 });
  }

  const result = await sendWhatsAppTextMessage(recipientPhone, TEST_MESSAGE, runtimeConfig.config);
  if (result.accepted) {
    return NextResponse.json({
      accepted: true,
      providerMessageId: result.providerMessageId,
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
