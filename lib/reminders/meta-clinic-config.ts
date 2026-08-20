import type { WhatsAppConfig } from "./whatsapp.ts";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

type MetaConnectionRow = {
  access_token: string;
  waba_id: string;
  phone_number_id: string;
  display_phone_number: string | null;
  verified_name: string | null;
  status: string;
};

export type ClinicMetaWhatsAppConfig = {
  config: WhatsAppConfig;
  wabaId: string;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
};

function baseConfig(env: Record<string, string | undefined>) {
  if (env.WHATSAPP_ENABLED !== "true") return null;
  const appSecret = env.WHATSAPP_APP_SECRET?.trim() ?? "";
  const verifyToken = env.WHATSAPP_VERIFY_TOKEN?.trim() ?? "";
  const graphApiVersion = env.WHATSAPP_GRAPH_API_VERSION?.trim() ?? "";
  const globalDailyLimit = Number(env.WHATSAPP_GLOBAL_DAILY_LIMIT);
  if (
    appSecret.length < 16
    || verifyToken.length < 16
    || !/^v\d+\.\d+$/.test(graphApiVersion)
    || !Number.isInteger(globalDailyLimit)
    || globalDailyLimit < 1
    || globalDailyLimit > 10_000
  ) return null;
  return { appSecret, verifyToken, graphApiVersion, globalDailyLimit };
}

export function readMetaRuntimeBase(env: Record<string, string | undefined> = process.env) {
  return baseConfig(env);
}

export async function readClinicMetaWhatsAppConfig(
  admin: AdminClient,
  clinicId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<ClinicMetaWhatsAppConfig | null> {
  if (!/^[0-9a-f-]{36}$/i.test(clinicId)) return null;
  const base = baseConfig(env);
  if (!base) return null;

  const db = admin as any;
  const { data, error } = await db.rpc("get_meta_whatsapp_delivery_config", {
    p_clinic_id: clinicId,
  });
  if (error || !Array.isArray(data) || !data[0]) return null;
  const row = data[0] as MetaConnectionRow;
  if (
    row.status !== "connected"
    || typeof row.access_token !== "string"
    || row.access_token.length < 32
    || row.access_token.length > 4096
    || !/^\d{5,32}$/.test(row.waba_id ?? "")
    || !/^\d{5,32}$/.test(row.phone_number_id ?? "")
  ) return null;

  return {
    config: {
      accessToken: row.access_token,
      phoneNumberId: row.phone_number_id,
      appSecret: base.appSecret,
      verifyToken: base.verifyToken,
      graphApiVersion: base.graphApiVersion,
      globalDailyLimit: base.globalDailyLimit,
    },
    wabaId: row.waba_id,
    displayPhoneNumber: row.display_phone_number ?? null,
    verifiedName: row.verified_name ?? null,
  };
}
