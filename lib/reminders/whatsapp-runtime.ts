import { readWhatsAppConfig, type WhatsAppConfig } from "./whatsapp.ts";

const e164Pattern = /^\+[1-9]\d{7,14}$/;
const idPattern = /^\d{5,32}$/;

export const ATLAS_WHATSAPP_META_TEST_MODE = "meta_test" as const;
export const ATLAS_WHATSAPP_PRODUCTION_MODE = "production" as const;
export const ATLAS_WHATSAPP_OTP_TEMPLATE = "atlas_login_otp_v1";
export const ATLAS_WHATSAPP_STAFF_INVITE_TEMPLATE = "atlas_staff_invite_v1";

export type AtlasWhatsAppMode = typeof ATLAS_WHATSAPP_META_TEST_MODE | typeof ATLAS_WHATSAPP_PRODUCTION_MODE;

export type AtlasWhatsAppRuntime = {
  mode: AtlasWhatsAppMode;
  config: WhatsAppConfig;
  wabaId: string | null;
  allowedRecipients: readonly string[] | null;
  otpTemplateName: string;
  staffInviteTemplateName: string;
};

function runtimeMode(env: Record<string, string | undefined>) {
  const value = env.ATLAS_WHATSAPP_MODE?.trim().toLowerCase();
  if (!value || value === ATLAS_WHATSAPP_PRODUCTION_MODE) return ATLAS_WHATSAPP_PRODUCTION_MODE;
  if (value === ATLAS_WHATSAPP_META_TEST_MODE) return ATLAS_WHATSAPP_META_TEST_MODE;
  throw new Error("Unsupported Atlas WhatsApp mode.");
}

function parseAllowedRecipients(value: string | undefined) {
  const raw = value?.trim() ?? "";
  // Meta's official test WABA already limits delivery to recipients explicitly
  // registered in Meta. Atlas can optionally narrow that set further without
  // requiring a duplicate app-level allowlist just to exercise test transport.
  if (!raw) return null;
  const recipients = [...new Set(raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean))];
  if (!recipients.length || recipients.some((phone) => !e164Pattern.test(phone))) {
    throw new Error("Meta test recipient allowlist must contain valid E.164 numbers.");
  }
  return recipients;
}

function readMetaTestRuntime(env: Record<string, string | undefined>): AtlasWhatsAppRuntime | null {
  if (env.WHATSAPP_TEST_ENABLED !== "true") return null;
  // Meta's test sender must never be selected by a Vercel production runtime.
  if (env.VERCEL_ENV === "production") {
    throw new Error("Meta test WhatsApp mode is forbidden in production.");
  }

  const accessToken = env.WHATSAPP_TEST_ACCESS_TOKEN?.trim() ?? "";
  const phoneNumberId = env.WHATSAPP_TEST_PHONE_NUMBER_ID?.trim() ?? "";
  const wabaId = env.WHATSAPP_TEST_WABA_ID?.trim() ?? "";
  // Outbound-only test mode does not require webhook secrets. They can be
  // supplied later when inbound webhook verification is exercised.
  const appSecret = env.WHATSAPP_TEST_APP_SECRET?.trim() ?? "";
  const verifyToken = env.WHATSAPP_TEST_VERIFY_TOKEN?.trim() ?? "";
  const graphApiVersion = (env.WHATSAPP_TEST_GRAPH_API_VERSION ?? env.WHATSAPP_GRAPH_API_VERSION ?? "v25.0").trim();
  const globalDailyLimit = Number(env.WHATSAPP_TEST_GLOBAL_DAILY_LIMIT ?? "100");

  if (
    !accessToken
    || !idPattern.test(phoneNumberId)
    || !idPattern.test(wabaId)
    || !/^v\d+\.\d+$/.test(graphApiVersion)
    || !Number.isInteger(globalDailyLimit)
    || globalDailyLimit < 1
    || globalDailyLimit > 1_000
  ) throw new Error("Meta test WhatsApp configuration is incomplete.");

  return {
    mode: ATLAS_WHATSAPP_META_TEST_MODE,
    config: {
      accessToken,
      phoneNumberId,
      appSecret,
      verifyToken,
      graphApiVersion,
      globalDailyLimit,
    },
    wabaId,
    allowedRecipients: parseAllowedRecipients(env.WHATSAPP_TEST_ALLOWED_RECIPIENTS),
    otpTemplateName: env.WHATSAPP_TEST_OTP_TEMPLATE?.trim() || ATLAS_WHATSAPP_OTP_TEMPLATE,
    staffInviteTemplateName: env.WHATSAPP_TEST_STAFF_INVITE_TEMPLATE?.trim() || ATLAS_WHATSAPP_STAFF_INVITE_TEMPLATE,
  };
}

export function readAtlasWhatsAppRuntime(
  env: Record<string, string | undefined> = process.env,
): AtlasWhatsAppRuntime | null {
  const mode = runtimeMode(env);
  if (mode === ATLAS_WHATSAPP_META_TEST_MODE) return readMetaTestRuntime(env);

  const config = readWhatsAppConfig(env);
  if (!config) return null;
  const wabaId = env.WHATSAPP_WABA_ID?.trim() ?? "";
  return {
    mode: ATLAS_WHATSAPP_PRODUCTION_MODE,
    config,
    wabaId: idPattern.test(wabaId) ? wabaId : null,
    allowedRecipients: null,
    otpTemplateName: env.WHATSAPP_OTP_TEMPLATE?.trim() || ATLAS_WHATSAPP_OTP_TEMPLATE,
    staffInviteTemplateName: env.WHATSAPP_STAFF_INVITE_TEMPLATE?.trim() || ATLAS_WHATSAPP_STAFF_INVITE_TEMPLATE,
  };
}

export function atlasWhatsAppRecipientAllowed(runtime: AtlasWhatsAppRuntime, phone: string) {
  if (!e164Pattern.test(phone)) return false;
  return runtime.allowedRecipients === null || runtime.allowedRecipients.includes(phone);
}
