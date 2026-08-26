export const ATLAS_AI_CLOUDFLARE_MODEL = process.env.ATLAS_AI_CLOUDFLARE_MODEL?.trim() || "@cf/openai/gpt-oss-120b";
export const ATLAS_AI_TRANSCRIPTION_MODEL = process.env.ATLAS_AI_TRANSCRIPTION_MODEL?.trim() || "@cf/openai/whisper-large-v3-turbo";

export type AtlasCloudflareAiConfig = {
  accountId: string;
  endpoint: string;
  runEndpoint: (model: string) => string;
  token: string;
  model: string;
};

function safeWorkersAiModel(value: string) {
  return /^@cf\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(value);
}

export function atlasCloudflareAiConfig(): AtlasCloudflareAiConfig | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_WORKERS_AI_TOKEN?.trim();
  if (!accountId || !token) return null;
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(accountId)) return null;

  const runEndpoint = (model: string) => {
    if (!safeWorkersAiModel(model)) throw new Error("invalid_workers_ai_model");
    const modelPath = model.split("/").map((segment) => encodeURIComponent(segment)).join("/");
    return `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${modelPath}`;
  };

  return {
    accountId,
    endpoint: `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/v1/chat/completions`,
    runEndpoint,
    token,
    model: ATLAS_AI_CLOUDFLARE_MODEL,
  };
}

export function atlasPaidVercelGatewayEnabled() {
  return Boolean(process.env.AI_GATEWAY_API_KEY?.trim());
}
