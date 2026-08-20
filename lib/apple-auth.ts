import { createPrivateKey, sign as signBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const APPLE_ISSUER = "https://appleid.apple.com";
const DEFAULT_NATIVE_CLIENT_ID = "com.atlasclinic.app";

type AppleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  id_token?: string;
  refresh_token?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type AppleIdClaims = {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  sub?: string;
};

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function applePrivateKey() {
  const value = process.env.ATLAS_APPLE_PRIVATE_KEY?.trim();
  if (!value) throw new Error("apple_private_key_missing");
  return value.replace(/\\n/g, "\n");
}

function appleSigningConfig() {
  const teamId = process.env.ATLAS_APPLE_TEAM_ID?.trim();
  const keyId = process.env.ATLAS_APPLE_KEY_ID?.trim();
  if (!teamId || !keyId) throw new Error("apple_signing_config_missing");
  return { teamId, keyId, privateKey: applePrivateKey() };
}

export function nativeAppleClientId() {
  return process.env.ATLAS_APPLE_NATIVE_CLIENT_ID?.trim() || DEFAULT_NATIVE_CLIENT_ID;
}

export function appleServerCredentialsConfigured() {
  return Boolean(
    process.env.ATLAS_APPLE_TEAM_ID?.trim()
    && process.env.ATLAS_APPLE_KEY_ID?.trim()
    && process.env.ATLAS_APPLE_PRIVATE_KEY?.trim(),
  );
}

function makeAppleClientSecret(clientId: string) {
  const { teamId, keyId, privateKey } = appleSigningConfig();
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: teamId,
    iat: now,
    exp: now + 300,
    aud: APPLE_ISSUER,
    sub: clientId,
  }));
  const signingInput = `${header}.${payload}`;
  const signature = signBytes("sha256", Buffer.from(signingInput), {
    key: createPrivateKey(privateKey),
    dsaEncoding: "ieee-p1363",
  });
  return `${signingInput}.${base64Url(signature)}`;
}

async function postApple(path: "/auth/token" | "/auth/revoke", body: URLSearchParams) {
  const response = await fetch(`${APPLE_ISSUER}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    // Never include Apple's body here: it can contain provider details that do not
    // belong in Atlas runtime logs.
    throw new Error(`apple_http_${response.status}`);
  }
  return response;
}

export function readAppleIdTokenClaims(token: string, expectedClientId: string): AppleIdClaims {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("apple_id_token_malformed");

  let claims: AppleIdClaims;
  try {
    claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as AppleIdClaims;
  } catch {
    throw new Error("apple_id_token_malformed");
  }

  const audienceMatches = typeof claims.aud === "string"
    ? claims.aud === expectedClientId
    : Array.isArray(claims.aud) && claims.aud.includes(expectedClientId);
  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== APPLE_ISSUER || !audienceMatches || !claims.sub || !claims.exp || claims.exp <= now) {
    throw new Error("apple_id_token_claims_invalid");
  }

  // This token is used only after it was returned directly by Apple's TLS-protected
  // authorization-code exchange. Supabase separately verifies the native identity
  // token used to create the Atlas session.
  return claims;
}

export async function exchangeAppleAuthorizationCode(authorizationCode: string) {
  const clientId = nativeAppleClientId();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: makeAppleClientSecret(clientId),
    code: authorizationCode,
    grant_type: "authorization_code",
  });
  const response = await postApple("/auth/token", body);
  const payload = await response.json() as AppleTokenResponse;
  if (!payload.refresh_token || !payload.id_token || payload.error) {
    throw new Error("apple_code_exchange_failed");
  }
  const claims = readAppleIdTokenClaims(payload.id_token, clientId);
  return { refreshToken: payload.refresh_token, clientId, subject: claims.sub! };
}

export async function revokeAppleRefreshToken(refreshToken: string, clientId: string) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: makeAppleClientSecret(clientId),
    token: refreshToken,
    token_type_hint: "refresh_token",
  });
  await postApple("/auth/revoke", body);
}

export async function retainAppleRefreshToken(userId: string, refreshToken: string, clientId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("store_apple_refresh_token_service", {
    p_user_id: userId,
    p_refresh_token: refreshToken,
    p_client_id: clientId,
  });
  if (error || data !== true) throw new Error("apple_refresh_store_failed");
}

export async function revokeAndForgetStoredAppleAuthorization(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_apple_refresh_token_service", { p_user_id: userId });
  if (error) throw new Error("apple_refresh_read_failed");

  const stored = data?.[0];
  let revokeError: Error | null = null;
  if (stored?.refresh_token && stored.client_id) {
    try {
      await revokeAppleRefreshToken(stored.refresh_token, stored.client_id);
    } catch (error) {
      revokeError = error instanceof Error ? error : new Error("apple_revoke_failed");
    }
  }

  // Forget the Atlas-held provider token even when Apple is temporarily unavailable.
  // Account deletion must never be held hostage by an external provider outage.
  const { error: deleteError } = await admin.rpc("delete_apple_refresh_token_service", { p_user_id: userId });
  if (deleteError) throw new Error("apple_refresh_delete_failed");
  if (revokeError) throw revokeError;
}
