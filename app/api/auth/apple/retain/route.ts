import { NextResponse } from "next/server";
import { appleServerCredentialsConfigured, exchangeAppleAuthorizationCode, retainAppleRefreshToken } from "@/lib/apple-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== requestUrl.origin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!appleServerCredentialsConfigured()) {
    return NextResponse.json({ error: "apple_not_configured" }, { status: 503 });
  }

  let authorizationCode = "";
  try {
    const body = await request.json() as { authorizationCode?: unknown };
    authorizationCode = typeof body.authorizationCode === "string" ? body.authorizationCode.trim() : "";
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (!authorizationCode || authorizationCode.length > 4096) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;
  if (userError || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const appleIdentity = user.identities?.find((identity) => identity.provider === "apple");
  const expectedSubject = typeof appleIdentity?.identity_data?.sub === "string"
    ? appleIdentity.identity_data.sub
    : null;
  if (!expectedSubject) return NextResponse.json({ error: "apple_identity_required" }, { status: 403 });

  try {
    const exchanged = await exchangeAppleAuthorizationCode(authorizationCode);
    if (exchanged.subject !== expectedSubject) {
      return NextResponse.json({ error: "identity_mismatch" }, { status: 403 });
    }
    await retainAppleRefreshToken(user.id, exchanged.refreshToken, exchanged.clientId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Atlas Apple authorization retention failed", {
      code: error instanceof Error ? error.message : "apple_retain_failed",
    });
    return NextResponse.json({ error: "apple_retain_failed" }, { status: 502 });
  }
}
