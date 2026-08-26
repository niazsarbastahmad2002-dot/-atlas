import { NextResponse } from "next/server";
import {
  ATLAS_AI_TRANSCRIPTION_MODEL,
  atlasCloudflareAiConfig,
} from "@/lib/atlas-ai-cloudflare";
import {
  atlasKurdishAsrPasses,
  checkAtlasVoiceUpload,
  cleanAtlasVoiceTranscript,
  isPlausibleAtlasVoiceTranscript,
  parseAtlasKurdishReconciliation,
  type AtlasVoiceLocale,
} from "@/lib/atlas-voice";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 24;
const buckets = new Map<string, { count: number; resetAt: number }>();
const allowedLocales = new Set<AtlasVoiceLocale>(["en", "ku", "bd", "ar"]);

type CloudflareConfig = NonNullable<ReturnType<typeof atlasCloudflareAiConfig>>;

function allowedRequest(userId: string) {
  const now = Date.now();
  const current = buckets.get(userId);
  if (!current || current.resetAt <= now) {
    buckets.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (current.count >= RATE_LIMIT) return false;
  current.count += 1;
  return true;
}

function sameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function initialPrompt(locale: AtlasVoiceLocale) {
  if (locale === "ku") {
    return "The speaker is speaking Sorani Kurdish, not Arabic or Persian. Write the spoken words in Sorani Kurdish Arabic script. Atlas clinic words may include: Atlas AI، کلینیک، مەوعید، دکتۆر، ڕیسێپشن، نەخۆش، بیرخستنەوە، قەرەباڵغی، no-show.";
  }
  if (locale === "bd") {
    return "The speaker is speaking Badini Kurdish, not Arabic, Persian, or Turkish. Write the spoken words in the Arabic-based Badini script used by Atlas. Common Atlas words include: Atlas AI، کلینیک، مەوعید، دکتۆر، ڕیسێپشن، نەخۆش، بیرخستنەوە، no-show.";
  }
  if (locale === "ar") {
    return "Iraqi Arabic clinic conversation. Common words: Atlas AI، العيادة، الموعد، الدكتور، الاستقبال، التذكير، عدم الحضور.";
  }
  return "Atlas clinic assistant. Common words: Atlas AI, clinic, appointment, doctor, reception, reminder, no-show.";
}

function extractTranscript(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const root = payload as Record<string, unknown>;
  const result = root.result && typeof root.result === "object"
    ? root.result as Record<string, unknown>
    : root;
  if (typeof result.text === "string") return cleanAtlasVoiceTranscript(result.text);
  if (result.transcription_info && typeof result.transcription_info === "object") {
    const info = result.transcription_info as Record<string, unknown>;
    if (typeof info.text === "string") return cleanAtlasVoiceTranscript(info.text);
  }
  return "";
}

async function transcribePass(
  audioBase64: string,
  locale: AtlasVoiceLocale,
  config: CloudflareConfig,
  language?: string,
) {
  const requestBody: Record<string, unknown> = {
    audio: audioBase64,
    task: "transcribe",
    vad_filter: true,
    initial_prompt: initialPrompt(locale),
  };
  if (language) requestBody.language = language;

  try {
    const response = await fetch(config.runEndpoint(ATLAS_AI_TRANSCRIPTION_MODEL), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return "";
    return extractTranscript(await response.json());
  } catch {
    return "";
  }
}

async function reconcileKurdishTranscript(
  candidates: string[],
  locale: "ku" | "bd",
  config: CloudflareConfig,
) {
  const unique = Array.from(new Set(candidates.map(cleanAtlasVoiceTranscript).filter(Boolean))).slice(0, 3);
  if (!unique.length) return null;

  const target = locale === "ku"
    ? "Sorani Kurdish in Arabic-based Kurdish script"
    : "Badini Kurdish in the Arabic-based script used by Atlas";

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0,
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content: `You are the final speech-transcription reconciler for Atlas Voice. The speaker used ${target}. You will receive several noisy ASR guesses from the SAME audio. Reconstruct only what the speaker most likely said. Do not answer the speaker, translate the meaning, add clinic facts, or invent missing words. Preserve Atlas/product terms and numbers. If the guesses do not provide enough evidence for a reliable transcript, return low confidence and an empty text. Return JSON only in exactly this shape: {"text":"...","confidence":"high|medium|low"}.`,
          },
          {
            role: "user",
            content: unique.map((candidate, index) => `Candidate ${index + 1}: ${candidate}`).join("\n"),
          },
        ],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return null;
    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const parsed = parseAtlasKurdishReconciliation(payload.choices?.[0]?.message?.content ?? "");
    if (!parsed || parsed.confidence === "low") return null;
    if (!isPlausibleAtlasVoiceTranscript(parsed.text, locale)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function transcribeAudio(audioBase64: string, locale: AtlasVoiceLocale, config: CloudflareConfig) {
  if (locale === "ku" || locale === "bd") {
    const passes = atlasKurdishAsrPasses(locale);
    const candidates = await Promise.all(
      passes.map((pass) => transcribePass(audioBase64, locale, config, pass.language)),
    );
    return reconcileKurdishTranscript(candidates, locale, config);
  }

  const language = locale === "en" ? "en" : "ar";
  const text = await transcribePass(audioBase64, locale, config, language);
  if (!text || !isPlausibleAtlasVoiceTranscript(text, locale)) return null;
  return { text, confidence: "high" as const };
}

function privateJson(body: Record<string, unknown>, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: {
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) {
    return privateJson({ error: "cross_origin_request_blocked" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return privateJson({ error: "unauthorized" }, { status: 401 });
  }
  if (!allowedRequest(userData.user.id)) {
    return privateJson({ error: "rate_limited" }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return privateJson({ error: "invalid_audio_request" }, { status: 400 });
  }

  const localeValue = String(form.get("locale") ?? "").trim() as AtlasVoiceLocale;
  const audio = form.get("audio");
  if (!allowedLocales.has(localeValue) || !(audio instanceof File)) {
    return privateJson({ error: "invalid_audio_request" }, { status: 400 });
  }

  const upload = checkAtlasVoiceUpload({ size: audio.size, type: audio.type, name: audio.name });
  if (!upload.ok) {
    if (upload.reason === "empty") return privateJson({ error: "no_speech" }, { status: 422 });
    if (upload.reason === "too_large") return privateJson({ error: "audio_too_large" }, { status: 413 });
    return privateJson({ error: "unsupported_audio" }, { status: 415 });
  }

  const config = atlasCloudflareAiConfig();
  if (!config) return privateJson({ error: "voice_unavailable" }, { status: 503 });

  const audioBase64 = Buffer.from(await audio.arrayBuffer()).toString("base64");
  const result = await transcribeAudio(audioBase64, localeValue, config);
  if (!result?.text) {
    const error = localeValue === "ku" || localeValue === "bd" ? "unclear_speech" : "no_speech";
    return privateJson({ error }, { status: 422 });
  }

  return privateJson({ text: result.text, confidence: result.confidence });
}
