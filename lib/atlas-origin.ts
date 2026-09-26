export const ATLAS_CANONICAL_ORIGIN = "https://atlasclinic.dpdns.org";

type AtlasOriginEnvironment = {
  VERCEL_ENV?: string;
  SITE_URL?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
};

function cleanOrigin(value: string) {
  return value.trim().replace(/\/$/, "");
}

export function atlasPublicOrigin(
  env: AtlasOriginEnvironment = process.env,
) {
  // Staff invitations are patient/clinic-facing links. In production they should
  // always use Atlas's canonical branded origin rather than a Vercel alias or a
  // stale SITE_URL left over from an earlier deployment.
  if (env.VERCEL_ENV === "production") return ATLAS_CANONICAL_ORIGIN;

  const configured = env.SITE_URL?.trim();
  if (configured) return cleanOrigin(configured);

  const productionHost = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) {
    return `https://${cleanOrigin(productionHost).replace(/^https?:\/\//, "")}`;
  }

  return "http://localhost:3000";
}
