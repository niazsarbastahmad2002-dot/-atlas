import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { normalizeAuthPhone } from "@/lib/phone-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

export type WhatsAppVerificationError =
  | "invalid_phone"
  | "rate_limited"
  | "whatsapp_not_configured"
  | "delivery_failed"
  | "invalid_challenge"
  | "expired_code"
  | "incorrect_code"
  | "too_many_attempts";

function secret() {
  const value = process.env.ATLAS_AUTH_SECRET?.trim()
    || process.env.SUPABASE_SECRET_KEY?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!value || value.length < 24) throw new Error("Atlas auth server secret is not configured.");
  return value;
}

function digest(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function hashVerifiedPhone(phone: string) {
  return digest(`atlas-phone-v1:${phone}`);
}

function hashOtp(challengeId: string, phone: string, code: string) {
  return digest(`atlas-otp-v1:${challengeId}:${phone}:${code}`);
}

function hashRequestIp(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim();
  return ip ? digest(`atlas-ip-v1:${ip}`) : null;
}

function metaSender() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const graphApiVersion = process.env.WHATSAPP_GRAPH_API_VERSION?.trim();
  if (!accessToken || !/^\d{5,32}$/.test(phoneNumberId ?? "") || !/^v\d+\.\d+$/.test(graphApiVersion ?? "")) return null;
  return {
    accessToken,
    phoneNumberId: phoneNumberId!,
    graphApiVersion: graphApiVersion!,
    templateName: process.env.ATLAS_WHATSAPP_AUTH_TEMPLATE_NAME?.trim() || "atlas_login_code",
    language: process.env.ATLAS_WHATSAPP_AUTH_TEMPLATE_LANGUAGE?.trim() || "en_US",
  };
}

async function sendCode(phone: string, code: string) {
  const config = metaSender();
  if (!config) return { ok: false as const, error: "whatsapp_not_configured" as WhatsAppVerificationError };
  const response = await fetch(`https://graph.facebook.com/${config.graphApiVersion}/${config.phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phone.replace(/^\+/, ""),
      type: "template",
      template: {
        name: config.templateName,
        language: { code: config.language },
        components: [
          { type: "body", parameters: [{ type: "text", text: code }] },
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
        ],
      },
    }),
    signal: AbortSignal.timeout(12_000),
  }).catch(() => null);
  if (!response) return { ok: false as const, error: "delivery_failed" as WhatsAppVerificationError };
  let body: any = null;
  try { body = await response.json(); } catch {}
  const id = Array.isArray(body?.messages) && typeof body.messages[0]?.id === "string" ? body.messages[0].id : null;
  if (response.ok && id) return { ok: true as const, messageId: id };
  console.error("Atlas WhatsApp verification delivery rejected", { status: response.status, code: body?.error?.code ?? "unknown" });
  return { ok: false as const, error: "delivery_failed" as WhatsAppVerificationError };
}

export function normalizeWhatsAppPhone(value: unknown) {
  return typeof value === "string" ? normalizeAuthPhone(value) : null;
}

export async function beginWhatsAppVerification(request: Request, rawPhone: unknown) {
  const phone = normalizeWhatsAppPhone(rawPhone);
  if (!phone) return { ok: false as const, error: "invalid_phone" as WhatsAppVerificationError };
  const admin = createAdminClient() as any;
  const privateDb = admin.schema("private");
  const phoneHash = hashVerifiedPhone(phone);
  const ipHash = hashRequestIp(request);
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const phoneCount = await privateDb.from("whatsapp_auth_challenges").select("id", { count: "exact", head: true }).eq("phone_hash", phoneHash).gte("created_at", since);
  const ipCount = ipHash
    ? await privateDb.from("whatsapp_auth_challenges").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since)
    : { count: 0, error: null };
  if (phoneCount.error || ipCount.error) throw new Error("WhatsApp auth rate limit store unavailable.");
  if ((phoneCount.count ?? 0) >= 6 || (ipCount.count ?? 0) >= 20) return { ok: false as const, error: "rate_limited" as WhatsAppVerificationError };

  const challengeId = randomUUID();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  const stored = await privateDb.from("whatsapp_auth_challenges").insert({
    id: challengeId,
    phone_hash: phoneHash,
    otp_hash: hashOtp(challengeId, phone, code),
    ip_hash: ipHash,
    expires_at: expiresAt,
  });
  if (stored.error) throw new Error("WhatsApp auth challenge store failed.");

  const sent = await sendCode(phone, code);
  if (!sent.ok) {
    await privateDb.from("whatsapp_auth_challenges").delete().eq("id", challengeId);
    return sent;
  }
  await privateDb.from("whatsapp_auth_challenges").update({ provider_message_id: sent.messageId }).eq("id", challengeId);
  return { ok: true as const, challengeId, phone, expiresAt, resendAfterSeconds: 60 };
}

export async function consumeWhatsAppVerification(rawPhone: unknown, rawChallengeId: unknown, rawCode: unknown) {
  const phone = normalizeWhatsAppPhone(rawPhone);
  const challengeId = typeof rawChallengeId === "string" && /^[0-9a-f-]{36}$/i.test(rawChallengeId) ? rawChallengeId : null;
  const code = typeof rawCode === "string" ? rawCode.replace(/\D/g, "").slice(0, 6) : "";
  if (!phone || !challengeId || !/^\d{6}$/.test(code)) return { ok: false as const, error: "invalid_challenge" as WhatsAppVerificationError };
  const admin = createAdminClient() as any;
  const privateDb = admin.schema("private");
  const result = await privateDb.from("whatsapp_auth_challenges")
    .select("id, phone_hash, otp_hash, expires_at, attempts, consumed_at")
    .eq("id", challengeId).maybeSingle();
  const row = result.data;
  if (result.error || !row || row.consumed_at || row.phone_hash !== hashVerifiedPhone(phone)) return { ok: false as const, error: "invalid_challenge" as WhatsAppVerificationError };
  if (new Date(row.expires_at).getTime() <= Date.now()) return { ok: false as const, error: "expired_code" as WhatsAppVerificationError };
  if (row.attempts >= OTP_MAX_ATTEMPTS) return { ok: false as const, error: "too_many_attempts" as WhatsAppVerificationError };
  const expected = Buffer.from(row.otp_hash, "hex");
  const actual = Buffer.from(hashOtp(challengeId, phone, code), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    await privateDb.from("whatsapp_auth_challenges").update({ attempts: row.attempts + 1 }).eq("id", challengeId);
    return { ok: false as const, error: "incorrect_code" as WhatsAppVerificationError };
  }
  const consumed = await privateDb.from("whatsapp_auth_challenges")
    .update({ consumed_at: new Date().toISOString(), attempts: row.attempts + 1 })
    .eq("id", challengeId).is("consumed_at", null).select("id").maybeSingle();
  if (consumed.error || !consumed.data) return { ok: false as const, error: "invalid_challenge" as WhatsAppVerificationError };
  return { ok: true as const, phone };
}
