import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
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

  const admin = createAdminClient();
  const rpc = admin.rpc as unknown as Rpc;
  const hash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await rpc("redeem_staff_invite_link_service", {
    p_token_hash: hash,
    p_user_id: userData.user.id,
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
