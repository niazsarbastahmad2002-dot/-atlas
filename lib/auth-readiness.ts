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
};

export async function getAtlasAuthReadiness(): Promise<AtlasAuthReadiness> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const base = {
    reachable: false,
    supabasePhoneEnabled: false,
    supabaseEmailEnabled: false,
    openPhoneSignupEnabled: process.env.NEXT_PUBLIC_ATLAS_PHONE_SIGNUP_ENABLED === "true",
    whatsappOtpEnabled: process.env.NEXT_PUBLIC_ATLAS_WHATSAPP_OTP_ENABLED === "true",
    directMetaOtpEnabled: process.env.NEXT_PUBLIC_ATLAS_DIRECT_META_OTP_ENABLED === "true"
      && process.env.WHATSAPP_DIRECT_OTP_ENABLED === "true",
    metaTestMode: process.env.ATLAS_WHATSAPP_MODE === "meta_test" && process.env.VERCEL_ENV !== "production",
  };

  if (!url || !key) return base;

  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/settings`, {
      headers: { apikey: key },
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
