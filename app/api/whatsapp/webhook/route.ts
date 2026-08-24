import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { readClinicMetaWhatsAppConfig } from "@/lib/reminders/meta-clinic-config";
import {
  hasMetaCoexistenceWebhook,
  summarizeMetaCoexistenceWebhook,
} from "@/lib/reminders/meta-coexistence";
import {
  extractPatientActionReplies,
  patientActionAcknowledgement,
  verifyPatientActionPayload,
} from "@/lib/reminders/patient-loop";
import {
  extractDeliveryStatuses,
  readBodyWithLimit,
  sendWhatsAppTextMessage,
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
    // WhatsApp history, contacts, or app-originated message bodies.
    console.info("Atlas WhatsApp coexistence webhook accepted", coexistence);
  }

  const deliveryEvents = extractDeliveryStatuses(payload);
  const patientReplies = extractPatientActionReplies(payload);
  if (!deliveryEvents.length && !patientReplies.length) {
    return NextResponse.json({ accepted: true }, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try { admin = createAdminClient(); } catch {
    return NextResponse.json({ error: "service_not_configured" }, { status: 503 });
  }

  for (const event of deliveryEvents) {
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

  for (const reply of patientReplies) {
    const verified = verifyPatientActionPayload(reply.payload, appSecret);
    if (!verified) {
      console.warn("Atlas ignored an invalid WhatsApp patient action payload");
      continue;
    }

    const { data, error } = await (admin as any).rpc("apply_whatsapp_patient_action_service", {
      p_reminder_id: verified.reminderId,
      p_action: verified.action,
      p_patient_phone: reply.fromPhone,
      p_provider_message_id: reply.providerMessageId,
      p_context_provider_message_id: reply.contextProviderMessageId,
    });
    if (error) {
      console.error("Atlas WhatsApp patient action write failed", { code: error.code ?? "unknown" });
      return NextResponse.json({ error: "patient_action_write_failed" }, { status: 500 });
    }

    const row = Array.isArray(data) ? data[0] as {
      result?: unknown;
      clinic_id?: unknown;
      reminder_language?: unknown;
    } | undefined : undefined;
    if (row?.result !== verified.action || typeof row.clinic_id !== "string") continue;

    // A patient reply opens the customer-service conversation. A short best-effort
    // acknowledgement closes the loop without making the database mutation depend
    // on a second outbound network request.
    const connection = await readClinicMetaWhatsAppConfig(admin, row.clinic_id);
    if (!connection) continue;
    const acknowledgement = patientActionAcknowledgement(
      typeof row.reminder_language === "string" ? row.reminder_language : "en",
      verified.action,
    );
    const sent = await sendWhatsAppTextMessage(`+${reply.fromPhone}`, acknowledgement, connection.config);
    if (!sent.accepted) {
      console.warn("Atlas patient action acknowledgement was not accepted", { code: sent.errorCode });
    }
  }

  return NextResponse.json({ accepted: true }, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
