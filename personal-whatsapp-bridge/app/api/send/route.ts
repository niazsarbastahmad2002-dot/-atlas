import { timingSafeEqual } from "node:crypto";
import { recipientAllowed, readPersonalWhatsAppConfig, sendPersonalWhatsAppText } from "../../../lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function equalSecret(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const configuredSecret = process.env.PERSONAL_SEND_SECRET?.trim() ?? "";
  const authorization = request.headers.get("authorization") ?? "";
  const suppliedSecret = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (configuredSecret.length < 32 || !equalSecret(configuredSecret, suppliedSecret)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { recipientPhone?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const recipientPhone = typeof body.recipientPhone === "string" ? body.recipientPhone.trim() : "";
  const message = typeof body.message === "string" ? body.message : "";
  if (!recipientPhone || !message.trim() || message.length > 1000) {
    return Response.json({ error: "invalid_arguments" }, { status: 400 });
  }

  let config;
  try {
    config = readPersonalWhatsAppConfig();
  } catch {
    return Response.json({ error: "transport_not_configured" }, { status: 503 });
  }
  if (!recipientAllowed(config, recipientPhone)) {
    return Response.json({ error: "recipient_not_allowed" }, { status: 403 });
  }

  const result = await sendPersonalWhatsAppText(recipientPhone, message, config);
  if (!result.accepted) {
    return Response.json(result, { status: result.retryable ? 503 : 502 });
  }
  return Response.json({
    accepted: true,
    providerMessageId: result.providerMessageId,
    recipientPhone,
  }, { status: 200 });
}
