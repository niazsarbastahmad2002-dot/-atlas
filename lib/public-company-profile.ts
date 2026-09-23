const TEMPORARY_SUPPORT_EMAIL = "niazsarbastahmad2002@gmail.com";
const CURRENT_PRODUCTION_ORIGIN = "https://atlasdemofixed.vercel.app";
const OFFICIAL_LEGAL_ENTITY_NAME = "Atlas Novera";
const OFFICIAL_COMPANY_REGISTRATION_NUMBER = "20260104383672";

function cleanLine(value: string | undefined, maxLength: number) {
  const cleaned = value?.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.length > maxLength) return null;
  return cleaned;
}

function cleanEmail(value: string | undefined) {
  const cleaned = cleanLine(value, 254)?.toLowerCase() ?? null;
  if (!cleaned || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) return null;
  return cleaned;
}

function cleanHttpsOrigin(value: string | undefined) {
  const cleaned = cleanLine(value, 512);
  if (!cleaned) return null;
  try {
    const url = new URL(cleaned);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function atlasPublicCompanyProfile() {
  const supportEmail = cleanEmail(process.env.ATLAS_SUPPORT_EMAIL) ?? TEMPORARY_SUPPORT_EMAIL;
  const legalEntityName =
    cleanLine(process.env.ATLAS_LEGAL_ENTITY_NAME, 180) ?? OFFICIAL_LEGAL_ENTITY_NAME;
  const registrationNumber =
    cleanLine(process.env.ATLAS_COMPANY_REGISTRATION_NUMBER, 120)
    ?? OFFICIAL_COMPANY_REGISTRATION_NUMBER;

  return {
    legalEntityName,
    legalEntityNameLocal: cleanLine(process.env.ATLAS_LEGAL_ENTITY_NAME_LOCAL, 180),
    registrationNumber,
    registeredAddress: cleanLine(process.env.ATLAS_REGISTERED_BUSINESS_ADDRESS, 300),
    publicPhone: cleanLine(process.env.ATLAS_PUBLIC_BUSINESS_PHONE, 80),
    supportEmail,
    privacyEmail: cleanEmail(process.env.ATLAS_PRIVACY_EMAIL) ?? supportEmail,
    canonicalOrigin: cleanHttpsOrigin(process.env.ATLAS_PUBLIC_SITE_URL) ?? CURRENT_PRODUCTION_ORIGIN,
    isVerifiedCompanyProfile: Boolean(legalEntityName && registrationNumber),
  } as const;
}
