import { NextResponse } from "next/server";
import {
  ATLAS_AI_TRANSCRIPTION_MODEL,
  atlasCloudflareAiConfig,
} from "@/lib/atlas-ai-cloudflare";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 3 * 1024 * 1024;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 12;
const buckets = new Map<string, { count: number; resetAt: number }>();
const allowedLocales = new Set(["en", "ku", "bd", "ar"]);
const allowedAudioTypes = new Set([
  "audio/mp4",
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/aac",
  "audio/x-m4a",
]);

type AtlasVoiceLocale = "en" | "ku" | "bd" | "ar";

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
    return "ئەم دەنگە بە کوردی سۆرانییە. وشە باوەکانی Atlas: کلینیک، مەوعید، دکتۆر، ڕیسێپشن، نەخۆش، بیرخستنەوە، Atlas AI.";
  }
  if (locale === "bd") {
    return "ئەڤ دەنگە ب کوردی بادینییە. پەیڤێن Atlas: کلینیک، مەوعید، دکتۆر، ڕیسێپشن، نەخۆش، بیرخستنەوە، Atlas AI.";
  }
  if (locale === "ar") {
    return "لهجة عراقية عن Atlas والعيادة والمواعيد والدكتور والاستقبال والتذكيرات وAtlas AI.";
  }
  return "Atlas clinic assistant. Common words: Atlas, clinic, appointment, doctor, reception, reminder, no-show.";
}

function extractTranscript(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const root = payload as Record<string, unknown>;
  const result = root.result && typeof root.result === "object"
    ? root.result as Record<string, unknown>
    : root;
  if (typeof result.text === "string") return result.text.trim();
  if (result.transcription_info && typeof result.transcription_info === "object") {
    const info = result.transcription_info as Record<string, unknown>;
    if (typeof info.text === "string") return info.text.trim();
  }
  return "";
}

async function normalizeKurdishTranscript(
  raw: string,
  locale: "ku" | "bd",
  config: NonNullable<ReturnType<typeof atlasCloudflareAiConfig>>,
) {
  if (!raw) return raw;
  const target = locale === "ku" ? "Sorani Kurdish (Arabic script)" : "Badini Kurdish (Arabic script)";
  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.1,
        max_tokens: 350,
        messages: [
          {
            role: "system",
            content: `You clean speech-to-text transcripts for Atlas. Return only the corrected transcript in ${target}. Preserve exactly what the speaker meant. Correct obvious ASR spelling/script errors and Atlas clinic vocabulary. Never add facts, answer the speaker, summarize, translate into another language, or invent missing words. If a phrase is genuinely unclear, keep the closest original wording.`,
          },
          { role: "user", content: raw.slice(0, 1800) },
        ],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return raw;
    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    return payload.choices?.[0]?.message?.content?.trim() || raw;
  } catch {
    return raw;
  }
}

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) {
    return NextResponse.json({ error: "cross_origin_request_blocked" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!allowedRequest(userData.user.id)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_audio_request" }, { status: 400 });
  }

  const localeValue = String(form.get("locale") ?? "").trim();
  const audio = form.get("audio");
  if (!allowedLocales.has(localeValue) || !(audio instanceof File)) {
    return NextResponse.json({ error: "invalid_audio_request" }, { status: 400 });
  }
  if (audio.size < 24 || audio.size > MAX_AUDIO_BYTES || !allowedAudioTypes.has(audio.type)) {
    return NextResponse.json({ error: "invalid_audio" }, { status: 400 });
  }

  const config = atlasCloudflareAiConfig();
  if (!config) {
    return NextResponse.json({ error: "voice_unavailable" }, { status: 503 });
  }

  const locale = localeValue as AtlasVoiceLocale;
  const audioBase64 = Buffer.from(await audio.arrayBuffer()).toString("base64");
  const requestBody: Record<string, unknown> = {
    audio: audioBase64,
    task: "transcribe",
    vad_filter: true,
    condition_on_previous_text: false,
    hallucination_silence_threshold: 1.5,
    initial_prompt: initialPrompt(locale),
  };
  if (locale === "en") requestBody.language = "en";
  if (locale === "ar") requestBody.language = "ar";

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
    if (!response.ok) {
      return NextResponse.json({ error: "voice_unavailable" }, { status: 503 });
    }

    const transcript = extractTranscript(await response.json());
    if (!transcript) {
      return NextResponse.json({ error: "no_speech" }, { status: 422 });
    }

    const text = locale === "ku" || locale === "bd"
      ? await normalizeKurdishTranscript(transcript, locale, config)
      : transcript;

    return NextResponse.json(
      { text },
      {
        headers: {
          "Cache-Control": "no-store, private",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "voice_unavailable" }, { status: 503 });
  }
}
