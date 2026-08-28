import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import {
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

  const suppliedProbe = new URL(request.url).searchParams.get("probe") ?? "";
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

  const recipientPhone = runtimeConfig.allowedRecipients?.[0] ?? "";
  if (!recipientPhone) {
    return NextResponse.json({ error: "no_explicit_test_recipient" }, { status: 503 });
  }

  const result = await sendWhatsAppTextMessage(recipientPhone, TEST_MESSAGE, runtimeConfig.config);
  return NextResponse.json({
    accepted: result.accepted,
    providerMessageId: result.providerMessageId,
    errorCode: result.errorCode,
    retryable: result.retryable,
  }, {
    status: result.accepted ? 200 : (result.retryable ? 503 : 502),
    headers: { "Cache-Control": "no-store" },
  });
}
