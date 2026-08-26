import { NextResponse } from "next/server";
import { ATLAS_AI_MODEL } from "@/lib/atlas-ai";
import { atlasGatewayHeaders } from "@/lib/atlas-ai-gateway";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== "preview") return NextResponse.json({ error: "not_found" }, { status: 404 });
  const headers = atlasGatewayHeaders(request);
  if (!headers) return NextResponse.json({ ready: false, reason: "no_auth" }, { status: 503 });

  try {
    const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: ATLAS_AI_MODEL,
        messages: [{ role: "user", content: "Reply with exactly ATLAS_READY" }],
        max_completion_tokens: 24,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return NextResponse.json({ ready: false, status: response.status }, { status: 503 });
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string | null } }> };
    const text = payload.choices?.[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ ready: text.includes("ATLAS_READY") });
  } catch {
    return NextResponse.json({ ready: false, reason: "request_failed" }, { status: 503 });
  }
}
