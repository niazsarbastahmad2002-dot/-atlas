import { NextResponse } from "next/server";
import { beginWhatsAppVerification } from "@/lib/whatsapp-verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { phone?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const result = await beginWhatsAppVerification(request, body.phone);
    if (!result.ok) {
      const status = result.error === "invalid_phone" ? 400
        : result.error === "rate_limited" ? 429
          : result.error === "whatsapp_not_configured" ? 503
            : 502;
      return NextResponse.json({ error: result.error }, { status, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({
      challengeId: result.challengeId,
      phone: result.phone,
      expiresAt: result.expiresAt,
      resendAfterSeconds: result.resendAfterSeconds,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Atlas WhatsApp verification start failed", { error: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ error: "service_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
