import { NextResponse } from "next/server";
import { ATLAS_AI_MODEL } from "@/lib/atlas-ai";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const gatewayToken = process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim();
  if (!gatewayToken) {
    return NextResponse.json({ ready: false, reason: "missing_gateway_token" }, { status: 503 });
  }

  try {
    const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${gatewayToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ATLAS_AI_MODEL,
        messages: [
          { role: "system", content: "Reply with exactly ATLAS_AI_READY." },
          { role: "user", content: "Atlas AI preview readiness check." },
        ],
        reasoning_effort: "low",
        max_completion_tokens: 32,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      return NextResponse.json({ ready: false, status: response.status, model: ATLAS_AI_MODEL }, { status: 503 });
    }

    const payload = await response.json() as { choices?: Array<{ message?: { content?: string | null } }> };
    const answer = payload.choices?.[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ ready: answer.includes("ATLAS_AI_READY"), model: ATLAS_AI_MODEL });
  } catch {
    return NextResponse.json({ ready: false, reason: "gateway_request_failed", model: ATLAS_AI_MODEL }, { status: 503 });
  }
}
