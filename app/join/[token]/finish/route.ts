import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { isUiLocale } from "@/lib/i18n/ui";
import { uiLocaleCookie } from "@/lib/i18n/ui-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RpcResult = { data: unknown; error: { message?: string; code?: string } | null };
type Rpc = (name: string, args: Record<string, unknown>) => Promise<RpcResult>;

type Context = { params: Promise<{ token: string }> };

function validToken(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

function redirectWithLocale(destination: URL, locale: string | null) {
  const response = NextResponse.redirect(destination);
  if (isUiLocale(locale)) {
    response.cookies.set(uiLocaleCookie, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    });
  }
  return response;
}

export async function GET(request: Request, { params }: Context) {
  const requestUrl = new URL(request.url);
  const inviteLocale = requestUrl.searchParams.get("lang");
  const { token } = await params;
  if (!validToken(token)) {
    return redirectWithLocale(new URL("/login?error=invalid_invite", requestUrl.origin), inviteLocale);
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    const destination = new URL(`/join/${encodeURIComponent(token)}`, requestUrl.origin);
    if (isUiLocale(inviteLocale)) destination.searchParams.set("lang", inviteLocale);
    return redirectWithLocale(destination, inviteLocale);
  }

  const admin = createAdminClient();
  const rpc: Rpc = (name, args) => (admin.rpc as unknown as Rpc).call(admin, name, args);
  const hash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await rpc("redeem_staff_invite_link_service", {
    p_token_hash: hash,
    p_user_id: userData.user.id,
  });

  if (error || typeof data !== "string") {
    console.error("Atlas receptionist invite redemption failed", { code: error?.code ?? "invalid_invite" });
    return redirectWithLocale(new URL("/login?error=invalid_invite", requestUrl.origin), inviteLocale);
  }

  const destination = new URL("/dashboard", requestUrl.origin);
  destination.searchParams.set("clinic", data);
  destination.searchParams.set("notice", "joined_clinic");
  return redirectWithLocale(destination, inviteLocale);
}
