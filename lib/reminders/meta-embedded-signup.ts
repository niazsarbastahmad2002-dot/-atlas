export type MetaEmbeddedSignupMode = "coexistence";

export type MetaEmbeddedSignupReadiness = {
  configured: boolean;
  enabled: boolean;
  mode: MetaEmbeddedSignupMode;
  appId: string | null;
  configId: string | null;
  graphApiVersion: string | null;
  blockers: string[];
};

function digits(value: string | undefined, min: number, max: number) {
  const candidate = value?.trim() ?? "";
  return new RegExp(`^\\d{${min},${max}}$`).test(candidate) ? candidate : null;
}

function graphVersion(value: string | undefined) {
  const candidate = value?.trim() ?? "";
  return /^v\d+\.\d+$/.test(candidate) ? candidate : null;
}

/**
 * Safe, secret-free readiness information for Atlas's future Meta Embedded Signup flow.
 *
 * This intentionally does not exchange OAuth codes or persist customer credentials yet.
 * It only establishes a strict configuration contract so Atlas can expose an onboarding
 * UI without accidentally starting an incomplete or non-coexistence flow.
 */
export function readMetaEmbeddedSignupReadiness(
  env: Record<string, string | undefined> = process.env,
): MetaEmbeddedSignupReadiness {
  const enabled = env.META_EMBEDDED_SIGNUP_ENABLED?.trim().toLowerCase() === "true";
  const appId = digits(env.META_APP_ID, 5, 32);
  const configId = digits(env.META_EMBEDDED_SIGNUP_CONFIG_ID, 5, 64);
  const graphApiVersion = graphVersion(env.WHATSAPP_GRAPH_API_VERSION);
  const mode: MetaEmbeddedSignupMode = "coexistence";
  const blockers: string[] = [];

  if (!enabled) blockers.push("embedded_signup_disabled");
  if (!appId) blockers.push("meta_app_id_missing");
  if (!configId) blockers.push("embedded_signup_config_missing");
  if (!graphApiVersion) blockers.push("graph_api_version_missing");

  // The app secret is never returned, but it must exist before Atlas can safely
  // exchange a future Embedded Signup authorization code server-side.
  if ((env.WHATSAPP_APP_SECRET?.trim() ?? "").length < 16) {
    blockers.push("meta_app_secret_missing");
  }

  return {
    configured: blockers.length === 0,
    enabled,
    mode,
    appId,
    configId,
    graphApiVersion,
    blockers,
  };
}
