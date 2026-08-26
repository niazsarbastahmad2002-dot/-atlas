export const ATLAS_AI_CLOUDFLARE_MODEL = process.env.ATLAS_AI_CLOUDFLARE_MODEL?.trim() || "@cf/openai/gpt-oss-120b";

export type AtlasCloudflareAiConfig = {
  endpoint: string;
  token: string;
  model: string;
};

export function atlasCloudflareAiConfig(): AtlasCloudflareAiConfig | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_WORKERS_AI_TOKEN?.trim();
  if (!accountId || !token) return null;
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(accountId)) return null;

  return {
    endpoint: `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/v1/chat/completions`,
    token,
    model: ATLAS_AI_CLOUDFLARE_MODEL,
  };
}

export function atlasPaidVercelGatewayEnabled() {
  return Boolean(process.env.AI_GATEWAY_API_KEY?.trim());
}
