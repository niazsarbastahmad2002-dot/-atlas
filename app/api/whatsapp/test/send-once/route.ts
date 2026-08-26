import { createDecipheriv } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ONE_TIME_KEY = "WGLQSKnJWFladwOnOncINRjlH9R__pyyLQkXsrWY51w";
const DECRYPTION_KEY = Buffer.from("b6cd3d82b3d508fd62af7dd60a2d8520979d2986147945d1dfab2cf07291592a", "hex");

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function decryptRecipient(value: string) {
  const packed = decodeBase64Url(value);
  if (packed.length < 12 + 16 + 8) return null;
  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(packed.length - 16);
  const ciphertext = packed.subarray(12, packed.length - 16);
  try {
    const decipher = createDecipheriv("aes-256-gcm", DECRYPTION_KEY, iv);
    decipher.setAuthTag(tag);
    const phone = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (request.nextUrl.searchParams.get("key") !== ONE_TIME_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const recipient = decryptRecipient(request.nextUrl.searchParams.get("p") ?? "");
  if (!recipient) return NextResponse.json({ error: "invalid_recipient" }, { status: 400 });

  const accessToken = process.env.WHATSAPP_TEST_ACCESS_TOKEN?.trim() ?? "";
  const phoneNumberId = process.env.WHATSAPP_TEST_PHONE_NUMBER_ID?.trim() ?? "";
  const graphApiVersion = (
    process.env.WHATSAPP_TEST_GRAPH_API_VERSION
    ?? process.env.WHATSAPP_GRAPH_API_VERSION
    ?? "v25.0"
  ).trim();
  if (
    process.env.ATLAS_WHATSAPP_MODE !== "meta_test"
    || process.env.WHATSAPP_TEST_ENABLED !== "true"
    || !accessToken
    || !/^\d{5,32}$/.test(phoneNumberId)
    || !/^v\d+\.\d+$/.test(graphApiVersion)
  ) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const response = await fetch(
    `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "template",
        template: { name: "hello_world", language: { code: "en_US" } },
      }),
      cache: "no-store",
    },
  );
  let body: Record<string, unknown> = {};
  try { body = await response.json() as Record<string, unknown>; } catch {}
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const first = messages[0] && typeof messages[0] === "object" ? messages[0] as Record<string, unknown> : null;
  const error = body.error && typeof body.error === "object" ? body.error as Record<string, unknown> : null;
  return NextResponse.json({
    ok: response.ok,
    status: response.status,
    providerMessageId: typeof first?.id === "string" ? first.id : null,
    errorCode: typeof error?.code === "number" || typeof error?.code === "string" ? String(error.code) : null,
    errorMessage: typeof error?.message === "string" ? error.message.slice(0, 220) : null,
  }, { status: response.ok ? 200 : 502, headers: { "Cache-Control": "no-store" } });
}
