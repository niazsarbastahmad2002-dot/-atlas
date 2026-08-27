import { readAtlasSupabasePublicConfig } from "@/lib/supabase/runtime-config";

type SupabaseAuthSettings = {
  external?: Record<string, boolean | undefined>;
  disable_signup?: boolean;
};

export type AtlasAuthReadiness = {
  reachable: boolean;
  supabasePhoneEnabled: boolean;
  supabaseEmailEnabled: boolean;
  openPhoneSignupEnabled: boolean;
  whatsappOtpEnabled: boolean;
  directMetaOtpEnabled: boolean;
  metaTestMode: boolean;
  isolatedTestSupabase: boolean;
};

export async function getAtlasAuthReadiness(): Promise<AtlasAuthReadiness> {
  const supabase = readAtlasSupabasePublicConfig();
  const metaTestMode = process.env.ATLAS_WHATSAPP_MODE === "meta_test" && process.env.VERCEL_ENV !== "production";
  const base = {
    reachable: false,
    supabasePhoneEnabled: false,
    supabaseEmailEnabled: false,
    openPhoneSignupEnabled: process.env.NEXT_PUBLIC_ATLAS_PHONE_SIGNUP_ENABLED === "true",
    whatsappOtpEnabled: process.env.NEXT_PUBLIC_ATLAS_WHATSAPP_OTP_ENABLED === "true",
    directMetaOtpEnabled: process.env.NEXT_PUBLIC_ATLAS_DIRECT_META_OTP_ENABLED === "true"
      && (process.env.WHATSAPP_DIRECT_OTP_ENABLED === "true" || metaTestMode),
    metaTestMode,
    isolatedTestSupabase: supabase.isolatedTest,
  };

  if (!supabase.url || !supabase.publishableKey) return base;

  try {
    const response = await fetch(`${supabase.url.replace(/\/$/, "")}/auth/v1/settings`, {
      headers: { apikey: supabase.publishableKey },
      cache: "no-store",
    });
    if (!response.ok) return base;
    const settings = await response.json() as SupabaseAuthSettings;
    return {
      ...base,
      reachable: true,
      supabasePhoneEnabled: settings.external?.phone === true,
      supabaseEmailEnabled: settings.external?.email === true,
    };
  } catch {
    return base;
  }
}
