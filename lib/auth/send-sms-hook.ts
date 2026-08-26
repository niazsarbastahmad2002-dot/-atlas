import { createHmac, timingSafeEqual } from "node:crypto";

export type SupabaseSendSmsHookPayload = {
  user: { phone?: unknown };
  sms: { otp?: unknown };
};

function signatureSecret(value: string) {
  const stripped = value.trim().replace(/^v1,whsec_/, "").replace(/^whsec_/, "");
  if (!/^[A-Za-z0-9+/=_-]{16,}$/.test(stripped)) return null;
  try {
    const normalized = stripped.replace(/-/g, "+").replace(/_/g, "/");
    const key = Buffer.from(normalized, "base64");
    return key.length >= 16 ? key : null;
  } catch {
    return null;
  }
}

function constantTimeBase64Equal(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifySupabaseSendSmsHook(
  rawBody: string,
  headers: Headers,
  secret: string,
  nowMs = Date.now(),
): SupabaseSendSmsHookPayload | null {
  if (!rawBody || rawBody.length > 100_000) return null;
  const webhookId = headers.get("webhook-id")?.trim() ?? "";
  const webhookTimestamp = headers.get("webhook-timestamp")?.trim() ?? "";
  const webhookSignature = headers.get("webhook-signature")?.trim() ?? "";
  if (!webhookId || webhookId.length > 256 || !/^\d{10}$/.test(webhookTimestamp) || !webhookSignature) return null;

  const timestampMs = Number(webhookTimestamp) * 1000;
  if (!Number.isSafeInteger(timestampMs) || Math.abs(nowMs - timestampMs) > 5 * 60 * 1000) return null;

  const key = signatureSecret(secret);
  if (!key) return null;
  const expected = createHmac("sha256", key)
    .update(`${webhookId}.${webhookTimestamp}.${rawBody}`)
    .digest("base64");
  const candidates = webhookSignature
    .split(/\s+/)
    .map((item) => item.split(",", 2))
    .filter(([version, signature]) => version === "v1" && Boolean(signature))
    .map(([, signature]) => signature);
  if (!candidates.some((candidate) => constantTimeBase64Equal(candidate, expected))) return null;

  let parsed: unknown;
  try { parsed = JSON.parse(rawBody); } catch { return null; }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const payload = parsed as Partial<SupabaseSendSmsHookPayload>;
  if (!payload.user || typeof payload.user !== "object" || !payload.sms || typeof payload.sms !== "object") return null;
  return payload as SupabaseSendSmsHookPayload;
}

export function readSupabaseSendSmsHookValues(payload: SupabaseSendSmsHookPayload) {
  const phone = typeof payload.user.phone === "string" ? payload.user.phone.trim() : "";
  const otp = typeof payload.sms.otp === "string" ? payload.sms.otp.trim() : "";
  if (!/^\+[1-9]\d{7,14}$/.test(phone) || !/^\d{6}$/.test(otp)) return null;
  return { phone, otp };
}
