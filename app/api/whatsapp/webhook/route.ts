import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import {
  hasMetaCoexistenceWebhook,
  summarizeMetaCoexistenceWebhook,
} from "@/lib/reminders/meta-coexistence";
import {
  extractDeliveryStatuses,
  readBodyWithLimit,
  verifyWebhookSignature,
} from "@/lib/reminders/whatsapp";
import { constantTimeEqual } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.WHATSAPP_VERIFY_TOKEN?.trim();

  if (
    mode !== "subscribe"
    || !expected
    || !token
    || !constantTimeEqual(token, expected)
    || !challenge
    || challenge.length > 512
  ) return new NextResponse("Forbidden", { status: 403 });

  return new NextResponse(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();
  const contentLength = request.headers.get("content-length");
  const declaredLength = contentLength === null ? null : Number(contentLength);
  if (!appSecret) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (
    declaredLength !== null
    && (!Number.isSafeInteger(declaredLength) || declaredLength < 0)
  ) return NextResponse.json({ error: "invalid_length" }, { status: 400 });
  if (declaredLength !== null && declaredLength > 1_000_000) {
    return NextResponse.json({ error: "request_too_large" }, { status: 413 });
  }

  const rawBody = await readBodyWithLimit(request.body, 1_000_000);
  if (!rawBody) return NextResponse.json({ error: "request_too_large" }, { status: 413 });
  if (!verifyWebhookSignature(
    rawBody,
    request.headers.get("x-hub-signature-256"),
    appSecret,
  )) return NextResponse.json({ error: "invalid_signature" }, { status: 403 });

  let payload: unknown;
  try { payload = JSON.parse(new TextDecoder().decode(rawBody)); } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const coexistence = summarizeMetaCoexistenceWebhook(payload);
  if (hasMetaCoexistenceWebhook(coexistence)) {
    // Deliberately keep observability content-free. Atlas does not persist synced
    // WhatsApp history, contacts, or app-originated messages at this stage.
    console.info("Atlas WhatsApp coexistence webhook accepted", coexistence);
  }

  const events = extractDeliveryStatuses(payload);
  if (!events.length) {
    return NextResponse.json({ accepted: true }, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try { admin = createAdminClient(); } catch {
    return NextResponse.json({ error: "service_not_configured" }, { status: 503 });
  }

  for (const event of events) {
    const eventKey = createHash("sha256")
      .update(`${event.providerMessageId}\0${event.status}\0${event.occurredAt}\0${event.errorCode ?? ""}`)
      .digest("hex");
    const { data, error } = await admin.rpc("record_whatsapp_delivery_status", {
      p_provider_message_id: event.providerMessageId,
      p_event_key: eventKey,
      p_status: event.status,
      p_occurred_at: event.occurredAt,
      p_error_code: event.errorCode ?? undefined,
    });
    if (error || data !== true) {
      console.error("Atlas reminder delivery write failed", { code: error?.code ?? "rejected_event" });
      return NextResponse.json({ error: "delivery_write_failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ accepted: true }, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
