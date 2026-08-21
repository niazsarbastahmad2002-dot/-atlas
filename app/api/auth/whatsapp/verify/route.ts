import { NextResponse } from "next/server";
import { establishWhatsAppAtlasSession } from "@/lib/whatsapp-session";
import { consumeWhatsAppVerification } from "@/lib/whatsapp-verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { phone?: unknown; challengeId?: unknown; code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const verification = await consumeWhatsAppVerification(body.phone, body.challengeId, body.code);
    if (!verification.ok) {
      const status = verification.error === "incorrect_code" || verification.error === "invalid_challenge" ? 400
        : verification.error === "expired_code" ? 410
          : verification.error === "too_many_attempts" ? 429
            : 400;
      return NextResponse.json({ error: verification.error }, { status, headers: { "Cache-Control": "no-store" } });
    }

    const user = await establishWhatsAppAtlasSession(verification.phone);
    return NextResponse.json({ ok: true, userId: user.id, phone: verification.phone }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Atlas WhatsApp verification session failed", { error: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ error: "session_failed" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
