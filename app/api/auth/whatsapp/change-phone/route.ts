import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { internalWhatsAppEmail } from "@/lib/whatsapp-session";
import { consumeWhatsAppVerification } from "@/lib/whatsapp-verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const newEmail = internalWhatsAppEmail(verified.phone);
    let page = 1;
    while (page <= 5) {
      const listed = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (listed.error) throw listed.error;
      const conflict = listed.data.users.find((candidate) =>
        candidate.id !== current.data.user!.id
        && (
          candidate.phone === verified.phone
          || candidate.user_metadata?.atlas_phone === verified.phone
          || candidate.email === newEmail
        )
      );
      if (conflict) {
        return NextResponse.json({ error: "phone_in_use" }, { status: 409, headers: { "Cache-Control": "no-store" } });
      }
      if (listed.data.users.length < 200) break;
      page += 1;
    }

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

    return NextResponse.json({ ok: true, phone: verified.phone }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Atlas WhatsApp phone change failed", { error: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ error: "service_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
