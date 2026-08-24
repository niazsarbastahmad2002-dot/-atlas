import { createHmac, randomInt, randomUUID } from "node:crypto";
import { normalizeAuthPhone } from "@/lib/phone-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppAuthenticationCode } from "@/lib/whatsapp-cloud";

const OTP_TTL_MS = 10 * 60 * 1000;

export type WhatsAppVerificationError =
  | "invalid_phone"
  | "rate_limited"
  | "whatsapp_not_configured"
  | "delivery_failed"
  | "invalid_challenge"
  | "expired_code"
  | "incorrect_code"
  | "too_many_attempts";

type RpcResult = { data: unknown; error: { message?: string; code?: string } | null };
type Rpc = (name: string, args: Record<string, unknown>) => Promise<RpcResult>;

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
  const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim();
  return ip ? digest(`atlas-ip-v1:${ip}`) : null;
}

function validChallengeId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function normalizeWhatsAppPhone(value: unknown) {
  return typeof value === "string" ? normalizeAuthPhone(value) : null;
}

export async function beginWhatsAppVerification(request: Request, rawPhone: unknown) {
  const phone = normalizeWhatsAppPhone(rawPhone);
  if (!phone) return { ok: false as const, error: "invalid_phone" as WhatsAppVerificationError };

  const admin = createAdminClient() as any;
  const rpc = admin.rpc as unknown as Rpc;
  const challengeId = randomUUID();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const phoneHash = hashVerifiedPhone(phone);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  const reserved = await rpc("reserve_whatsapp_auth_challenge_service", {
    p_id: challengeId,
    p_phone_hash: phoneHash,
    p_otp_hash: hashOtp(challengeId, phone, code),
    p_ip_hash: hashRequestIp(request),
    p_expires_at: expiresAt,
  });
  if (reserved.error) throw new Error("WhatsApp auth challenge reservation failed.");
  if (reserved.data === "rate_limited") {
    return { ok: false as const, error: "rate_limited" as WhatsAppVerificationError };
  }
  if (reserved.data !== "ok") throw new Error("WhatsApp auth challenge reservation rejected.");

  const sent = await sendWhatsAppAuthenticationCode(phone, code);
  if (!sent.ok) {
    await admin.schema("private").from("whatsapp_auth_challenges").delete().eq("id", challengeId);
    const error: WhatsAppVerificationError = sent.error === "provider_rate_limited"
      ? "rate_limited"
      : sent.error === "whatsapp_not_configured" || sent.error === "whatsapp_disabled" || sent.error === "template_not_ready"
        ? "whatsapp_not_configured"
        : "delivery_failed";
    return { ok: false as const, error };
  }

  await admin.schema("private")
    .from("whatsapp_auth_challenges")
    .update({ provider_message_id: sent.messageId })
    .eq("id", challengeId);

  return {
    ok: true as const,
    challengeId,
    phone,
    expiresAt,
    resendAfterSeconds: 60,
  };
}

export async function consumeWhatsAppVerification(rawPhone: unknown, rawChallengeId: unknown, rawCode: unknown) {
  const phone = normalizeWhatsAppPhone(rawPhone);
  const challengeId = validChallengeId(rawChallengeId) ? rawChallengeId : null;
  const code = typeof rawCode === "string" ? rawCode.replace(/\D/g, "").slice(0, 6) : "";
  if (!phone || !challengeId || !/^\d{6}$/.test(code)) {
    return { ok: false as const, error: "invalid_challenge" as WhatsAppVerificationError };
  }

  const admin = createAdminClient();
  const rpc = admin.rpc as unknown as Rpc;
  const checked = await rpc("verify_whatsapp_auth_challenge_service", {
    p_id: challengeId,
    p_phone_hash: hashVerifiedPhone(phone),
    p_candidate_otp_hash: hashOtp(challengeId, phone, code),
  });
  if (checked.error) throw new Error("WhatsApp auth challenge verification failed.");

  const status = typeof checked.data === "string" ? checked.data : "invalid_challenge";
  if (status !== "ok") {
    const error: WhatsAppVerificationError = status === "expired_code"
      ? "expired_code"
      : status === "incorrect_code"
        ? "incorrect_code"
        : status === "too_many_attempts"
          ? "too_many_attempts"
          : "invalid_challenge";
    return { ok: false as const, error };
  }

  return { ok: true as const, phone, challengeId };
}

export async function finalizeWhatsAppVerification(phone: string, challengeId: string) {
  const admin = createAdminClient();
  const rpc = admin.rpc as unknown as Rpc;
  const finalized = await rpc("finalize_whatsapp_auth_challenge_service", {
    p_id: challengeId,
    p_phone_hash: hashVerifiedPhone(phone),
  });
  if (finalized.error) throw new Error("WhatsApp auth challenge finalization failed.");
  return finalized.data === true;
}
