import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { normalizeAuthPhone } from "@/lib/phone-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RpcResult = { data: unknown; error: { message?: string; code?: string } | null };
type Rpc = (name: string, args: Record<string, unknown>) => Promise<RpcResult>;

type Context = { params: Promise<{ token: string }> };

function validToken(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

export async function GET(request: Request, { params }: Context) {
  const requestUrl = new URL(request.url);
  const { token } = await params;
  if (!validToken(token)) {
    return NextResponse.redirect(new URL("/login?error=invalid_invite", requestUrl.origin));
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.redirect(new URL(`/join/${encodeURIComponent(token)}`, requestUrl.origin));
  }

  const verifiedPhone = userData.user.phone_confirmed_at
    ? normalizeAuthPhone(userData.user.phone ?? "")
    : null;
  if (!verifiedPhone) {
    const destination = new URL("/dashboard", requestUrl.origin);
    destination.searchParams.set("notice", "verified_phone_required_for_invite");
    return NextResponse.redirect(destination);
  }

  const admin = createAdminClient();
  const rpc: Rpc = (name, args) => (admin.rpc as unknown as Rpc).call(admin, name, args);
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const verifiedPhoneHash = createHash("sha256").update(verifiedPhone).digest("hex");
  const { data, error } = await rpc("redeem_phone_staff_invite_link_service", {
    p_token_hash: tokenHash,
    p_user_id: userData.user.id,
    p_verified_phone_hash: verifiedPhoneHash,
  });

  if (error || typeof data !== "string") {
    console.error("Atlas receptionist invite redemption failed", { code: error?.code ?? "invalid_invite" });
    return NextResponse.redirect(new URL("/login?error=invalid_invite", requestUrl.origin));
  }

  const destination = new URL("/dashboard", requestUrl.origin);
  destination.searchParams.set("clinic", data);
  destination.searchParams.set("notice", "joined_clinic");
  return NextResponse.redirect(destination);
}
