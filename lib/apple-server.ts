import { createPrivateKey, sign } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_NATIVE_CLIENT_ID = "com.atlasappointments.app";
const DEFAULT_WEB_CLIENT_ID = "com.atlasappointments.app.web";
const APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token";
const APPLE_REVOKE_URL = "https://appleid.apple.com/auth/revoke";

type RpcResult = { data: unknown; error: { message?: string; code?: string } | null };
type Rpc = (name: string, args: Record<string, unknown>) => Promise<RpcResult>;

type AppleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  id_token?: string;
  refresh_token?: string;
  token_type?: string;
  error?: string;
};

export type AppleRevocationResult = "revoked" | "manual_required";
export type AppleRevocationCredential = {
  refreshToken: string;
  clientId: string;
  refreshSecretId: string;
};

function base64url(value: Buffer | string) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
  return buffer.toString("base64url");
}

function normalizedPrivateKey() {
  const value = process.env.ATLAS_APPLE_PRIVATE_KEY?.trim();
  return value ? value.replace(/\\n/g, "\n") : null;
}

function signingConfig() {
  const teamId = process.env.ATLAS_APPLE_TEAM_ID?.trim();
  const keyId = process.env.ATLAS_APPLE_KEY_ID?.trim();
  const privateKey = normalizedPrivateKey();
  if (!teamId || !keyId || !privateKey) return null;
  return { teamId, keyId, privateKey };
}

function appleClientSecret(clientId: string) {
  const config = signingConfig();
  if (!config) throw new Error("apple_server_credentials_missing");

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "ES256", kid: config.keyId, typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    iss: config.teamId,
    iat: now,
    exp: now + 300,
    aud: "https://appleid.apple.com",
    sub: clientId,
  }));
  const signingInput = `${header}.${payload}`;
  const signature = sign("sha256", Buffer.from(signingInput, "utf8"), {
    key: createPrivateKey(config.privateKey),
    dsaEncoding: "ieee-p1363",
  });
  return `${signingInput}.${base64url(signature)}`;
}

function decodeJwtSubject(idToken: string | undefined) {
  if (!idToken) return null;
  try {
    const payload = idToken.split(".")[1];
    if (!payload) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: unknown };
    return typeof parsed.sub === "string" ? parsed.sub : null;
  } catch {
    return null;
  }
}

function adminRpc() {
  const admin = createAdminClient();
  return { admin, rpc: admin.rpc as unknown as Rpc };
}

export function atlasAppleNativeClientId() {
  return process.env.ATLAS_IOS_BUNDLE_ID?.trim() || DEFAULT_NATIVE_CLIENT_ID;
}

export function atlasAppleWebClientId() {
  return process.env.ATLAS_APPLE_WEB_CLIENT_ID?.trim() || DEFAULT_WEB_CLIENT_ID;
}

export async function storeAppleRefreshToken(userId: string, refreshToken: string, clientId: string) {
  const { rpc } = adminRpc();
  const { data, error } = await rpc("store_apple_refresh_token_service", {
    p_user_id: userId,
    p_refresh_token: refreshToken,
    p_client_id: clientId,
  });
  if (error || data !== true) throw new Error("apple_refresh_token_store_failed");
}

export async function exchangeAndStoreNativeAppleAuthorization(input: {
  userId: string;
  authorizationCode: string;
  expectedAppleSubject: string;
}) {
  const clientId = atlasAppleNativeClientId();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: appleClientSecret(clientId),
    code: input.authorizationCode,
    grant_type: "authorization_code",
  });

  const response = await fetch(APPLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as AppleTokenResponse;
  if (!response.ok || !payload.refresh_token || !payload.id_token) {
    throw new Error(`apple_authorization_exchange_failed:${payload.error ?? response.status}`);
  }

  const appleSubject = decodeJwtSubject(payload.id_token);
  if (!appleSubject || appleSubject !== input.expectedAppleSubject) {
    throw new Error("apple_authorization_subject_mismatch");
  }

  await storeAppleRefreshToken(input.userId, payload.refresh_token, clientId);
}

export async function getStoredAppleRevocationCredential(userId: string): Promise<AppleRevocationCredential | null> {
  const { rpc } = adminRpc();
  const { data, error } = await rpc("get_apple_revocation_credential_service", { p_user_id: userId });
  if (error) throw new Error("apple_refresh_token_read_failed");

  const row = Array.isArray(data) && data.length > 0
    ? data[0] as { refresh_token?: unknown; client_id?: unknown; refresh_secret_id?: unknown }
    : null;
  if (!row) return null;
  if (typeof row.refresh_token !== "string" || typeof row.client_id !== "string" || typeof row.refresh_secret_id !== "string") {
    throw new Error("apple_refresh_token_invalid");
  }

  return {
    refreshToken: row.refresh_token,
    clientId: row.client_id,
    refreshSecretId: row.refresh_secret_id,
  };
}

export async function revokeAppleAuthorization(credential: AppleRevocationCredential): Promise<AppleRevocationResult> {
  try {
    const body = new URLSearchParams({
      client_id: credential.clientId,
      client_secret: appleClientSecret(credential.clientId),
      token: credential.refreshToken,
      token_type_hint: "refresh_token",
    });
    const response = await fetch(APPLE_REVOKE_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    return response.ok ? "revoked" : "manual_required";
  } catch {
    return "manual_required";
  }
}

export async function cleanupAppleRefreshSecret(refreshSecretId: string) {
  const { rpc } = adminRpc();
  const { error } = await rpc("delete_apple_refresh_secret_service", { p_secret_id: refreshSecretId });
  if (error) throw new Error("apple_refresh_token_cleanup_failed");
}
