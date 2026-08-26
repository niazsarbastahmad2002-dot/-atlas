import { NextResponse } from "next/server";
import { atlasGatewayHeaders } from "@/lib/atlas-ai-gateway";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_AUDIO_BASE64_CHARS = 2_800_000;
const allowedMediaTypes = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const audio = typeof body.audio === "string" ? body.audio.trim() : "";
  const mediaType = typeof body.mediaType === "string" ? body.mediaType.split(";")[0].trim().toLowerCase() : "";
  if (!audio || audio.length > MAX_AUDIO_BASE64_CHARS || !allowedMediaTypes.has(mediaType) || !/^[A-Za-z0-9+/=\r\n]+$/.test(audio)) {
    return NextResponse.json({ error: "invalid_audio" }, { status: 400 });
  }

  const headers = atlasGatewayHeaders(request, { "ai-model-id": "openai/whisper-1" });
  if (!headers) return NextResponse.json({ error: "ai_not_configured" }, { status: 503 });

  let response: Response;
  try {
    response = await fetch("https://ai-gateway.vercel.sh/v4/ai/transcription-model", {
      method: "POST",
      headers,
      body: JSON.stringify({ audio, mediaType }),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return NextResponse.json({ error: "voice_unavailable" }, { status: 503 });
  }

  if (!response.ok) {
    console.error("Atlas AI transcription failed", { status: response.status });
    return NextResponse.json({ error: response.status === 402 ? "ai_budget" : "voice_unavailable" }, { status: 503 });
  }

  const payload = await response.json() as { text?: string | null };
  const text = payload.text?.trim();
  if (!text) return NextResponse.json({ error: "empty_transcript" }, { status: 422 });
  return NextResponse.json({ text }, { headers: { "Cache-Control": "no-store" } });
}
