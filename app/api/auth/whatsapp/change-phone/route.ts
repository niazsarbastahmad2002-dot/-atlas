import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { internalWhatsAppEmail } from "@/lib/whatsapp-session";
import { consumeWhatsAppVerification, finalizeWhatsAppVerification, hashVerifiedPhone } from "@/lib/whatsapp-verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RpcResult = { data: unknown; error: { message?: string; code?: string } | null };
type Rpc = (name: string, args: Record<string, unknown>) => Promise<RpcResult>;

export async function POST(request: Request) {
  const supabase = await createClient();
  const current = await supabase.auth.getUser();
  if (current.error || !current.data.user) {
    return NextResponse.json({ error: "signed_out" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  let body: { phone?: unknown; challengeId?: unknown; code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const verified = await consumeWhatsAppVerification(body.phone, body.challengeId, body.code);
    if (!verified.ok) {
      const status = verified.error === "expired_code" ? 410
        : verified.error === "too_many_attempts" ? 429
          : 400;
      return NextResponse.json({ error: verified.error }, { status, headers: { "Cache-Control": "no-store" } });
    }

    const admin = createAdminClient();
    const rpc = admin.rpc as unknown as Rpc;
    const phoneHash = hashVerifiedPhone(verified.phone);
    const resolved = await rpc("resolve_whatsapp_identity_service", {
      p_phone: verified.phone,
      p_phone_hash: phoneHash,
    });
    if (resolved.error) throw new Error("Atlas phone identity lookup failed.");

    if (typeof resolved.data === "string" && resolved.data !== current.data.user.id) {
      await finalizeWhatsAppVerification(verified.phone, verified.challengeId);
      return NextResponse.json({ error: "phone_in_use" }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }

    const newEmail = internalWhatsAppEmail(verified.phone);
    const updated = await admin.auth.admin.updateUserById(current.data.user.id, {
      phone: verified.phone,
      phone_confirm: true,
      email: newEmail,
      email_confirm: true,
      user_metadata: {
        ...(current.data.user.user_metadata ?? {}),
        atlas_phone: verified.phone,
        atlas_identity: "whatsapp_phone",
        phone_verified_via: "whatsapp",
      },
    });
    if (updated.error || !updated.data.user) throw updated.error ?? new Error("Atlas phone update failed.");

    const bound = await rpc("bind_whatsapp_identity_service", {
      p_phone_hash: phoneHash,
      p_user_id: current.data.user.id,
    });
    if (bound.error || bound.data !== true) throw new Error("Atlas phone identity binding failed.");

    await finalizeWhatsAppVerification(verified.phone, verified.challengeId);
    return NextResponse.json({ ok: true, phone: verified.phone }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Atlas WhatsApp phone change failed", { error: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ error: "service_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
