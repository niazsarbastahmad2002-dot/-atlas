const VERCEL_REQUEST_CONTEXT = Symbol.for("@vercel/request-context");

export type AtlasGatewayAuthMethod = "api-key" | "oidc";

type VercelRequestContext = { headers?: Record<string, string> };

export function atlasGatewayAuth(request: Request): { token: string; method: AtlasGatewayAuthMethod } | null {
  const apiKey = process.env.AI_GATEWAY_API_KEY?.trim();
  if (apiKey) return { token: apiKey, method: "api-key" };

  const configuredOidc = process.env.VERCEL_OIDC_TOKEN?.trim();
  if (configuredOidc) return { token: configuredOidc, method: "oidc" };

  const requestToken = request.headers.get("x-vercel-oidc-token")?.trim();
  if (requestToken) return { token: requestToken, method: "oidc" };

  const runtime = globalThis as typeof globalThis & {
    [VERCEL_REQUEST_CONTEXT]?: { get?: () => VercelRequestContext };
  };
  const runtimeToken = runtime[VERCEL_REQUEST_CONTEXT]?.get?.().headers?.["x-vercel-oidc-token"]?.trim();
  return runtimeToken ? { token: runtimeToken, method: "oidc" } : null;
}

export function atlasGatewayHeaders(request: Request, extra?: Record<string, string>) {
  const auth = atlasGatewayAuth(request);
  if (!auth) return null;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${auth.token}`,
    "Content-Type": "application/json",
    "ai-gateway-protocol-version": "0.0.1",
    "ai-gateway-auth-method": auth.method,
    ...extra,
  };

  const team = process.env.VERCEL_ORG_ID?.trim();
  if (team?.startsWith("team_")) headers["x-vercel-ai-gateway-team"] = team;
  return headers;
}
