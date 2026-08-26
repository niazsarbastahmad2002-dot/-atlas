import { NextResponse } from "next/server";
import { atlasGatewayHeaders } from "@/lib/atlas-ai-gateway";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_SPEECH_TEXT_LENGTH = 2200;

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

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text || text.length > MAX_SPEECH_TEXT_LENGTH) {
    return NextResponse.json({ error: "invalid_text" }, { status: 400 });
  }

  const headers = atlasGatewayHeaders(request, { "ai-model-id": "openai/tts-1" });
  if (!headers) return NextResponse.json({ error: "ai_not_configured" }, { status: 503 });

  let response: Response;
  try {
    response = await fetch("https://ai-gateway.vercel.sh/v4/ai/speech-model", {
      method: "POST",
      headers,
      body: JSON.stringify({
        text,
        voice: "alloy",
        outputFormat: "mp3",
        speed: 1,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return NextResponse.json({ error: "voice_unavailable" }, { status: 503 });
  }

  if (!response.ok) {
    console.error("Atlas AI speech failed", { status: response.status });
    return NextResponse.json({ error: response.status === 402 ? "ai_budget" : "voice_unavailable" }, { status: 503 });
  }

  const payload = await response.json() as { audio?: string | null };
  const audio = payload.audio?.trim();
  if (!audio) return NextResponse.json({ error: "empty_audio" }, { status: 503 });
  return NextResponse.json({ audio, mediaType: "audio/mpeg" }, { headers: { "Cache-Control": "no-store" } });
}
