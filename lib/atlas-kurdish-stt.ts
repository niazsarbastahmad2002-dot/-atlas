import { cleanAtlasVoiceTranscript, type AtlasVoiceLocale } from "./atlas-voice";

const DEFAULT_KURDISH_STT_ENDPOINT = "https://www.kurdishtts.com/api/stt-proxy";

export type AtlasKurdishSttDialect = "sorani" | "kurmanji";

export function atlasKurdishSttDialect(locale: AtlasVoiceLocale): AtlasKurdishSttDialect | null {
  if (locale === "ku") return "sorani";
  if (locale === "bd") return "kurmanji";
  return null;
}

export function atlasKurdishSttConfig() {
  const apiKey = String(process.env.ATLAS_KURDISH_STT_API_KEY ?? "").trim();
  if (!apiKey) return null;
  const endpoint = String(process.env.ATLAS_KURDISH_STT_ENDPOINT ?? DEFAULT_KURDISH_STT_ENDPOINT).trim();
  if (!endpoint.startsWith("https://")) return null;
  return { apiKey, endpoint };
}

export function extractAtlasKurdishSttText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const root = payload as Record<string, unknown>;
  return typeof root.text === "string" ? cleanAtlasVoiceTranscript(root.text) : "";
}

export async function transcribeWithAtlasKurdishStt(audio: File, locale: "ku" | "bd") {
  const config = atlasKurdishSttConfig();
  const dialect = atlasKurdishSttDialect(locale);
  if (!config || !dialect) return null;

  const form = new FormData();
  form.append("file", audio, audio.name || "atlas-voice.wav");
  form.append("dialect", dialect);

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: { "x-api-key": config.apiKey },
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return null;
    const text = extractAtlasKurdishSttText(await response.json());
    return text ? { text, dialect } : null;
  } catch {
    return null;
  }
}
