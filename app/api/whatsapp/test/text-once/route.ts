import { createDecipheriv } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ONE_TIME_KEY = "kV7WF3_hBdJB5d8bds5AqL3Xhi5CoY6WxVBCSrEsBDY";
const DECRYPTION_KEY = Buffer.from("b6cd3d82b3d508fd62af7dd60a2d8520979d2986147945d1dfab2cf07291592a", "hex");

function decryptRecipient(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const packed = Buffer.from(padded, "base64");
  if (packed.length < 36) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", DECRYPTION_KEY, packed.subarray(0, 12));
    decipher.setAuthTag(packed.subarray(packed.length - 16));
    const phone = Buffer.concat([decipher.update(packed.subarray(12, packed.length - 16)), decipher.final()]).toString("utf8");
    return /^\+9647\d{9}$/.test(phone) ? phone : null;
  } catch { return null; }
}

export async function GET(request: NextRequest) {
  if (process.env.VERCEL_ENV === "production") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (request.nextUrl.searchParams.get("key") !== ONE_TIME_KEY) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const recipient = decryptRecipient(request.nextUrl.searchParams.get("p") ?? "");
  if (!recipient) return NextResponse.json({ error: "invalid_recipient" }, { status: 400 });
  const token = process.env.WHATSAPP_TEST_ACCESS_TOKEN?.trim() ?? "";
  const phoneId = process.env.WHATSAPP_TEST_PHONE_NUMBER_ID?.trim() ?? "";
  const version = (process.env.WHATSAPP_TEST_GRAPH_API_VERSION ?? process.env.WHATSAPP_GRAPH_API_VERSION ?? "v25.0").trim();
  if (!token || !/^\d{5,32}$/.test(phoneId) || !/^v\d+\.\d+$/.test(version)) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const response = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: recipient, type: "text", text: { preview_url: false, body: "Atlas test connection check." } }),
    cache: "no-store",
  });
  const body = await response.json() as Record<string, unknown>;
  const error = body.error && typeof body.error === "object" ? body.error as Record<string, unknown> : null;
  return NextResponse.json({ ok: response.ok, status: response.status, errorCode: error?.code ?? null, errorMessage: typeof error?.message === "string" ? error.message.slice(0, 180) : null }, { status: response.ok ? 200 : 502, headers: { "Cache-Control": "no-store" } });
}
