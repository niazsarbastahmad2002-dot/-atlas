import { NextResponse } from "next/server";
import { exchangeAndStoreNativeAppleAuthorization } from "@/lib/apple-server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function appleSubject(user: { identities?: Array<{ provider?: string; id?: string; identity_data?: Record<string, unknown> }> | null }) {
  const identity = user.identities?.find((item) => item.provider === "apple");
  const subject = identity?.identity_data?.sub;
  if (typeof subject === "string") return subject;
  return typeof identity?.id === "string" ? identity.id : null;
}

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== requestUrl.origin) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let authorizationCode = "";
  try {
    const body = await request.json() as { authorization_code?: unknown };
    if (typeof body.authorization_code === "string") authorizationCode = body.authorization_code.trim();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!authorizationCode || authorizationCode.length > 4096) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return NextResponse.json({ ok: false }, { status: 401 });

  const expectedAppleSubject = appleSubject(userData.user);
  if (!expectedAppleSubject) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  try {
    await exchangeAndStoreNativeAppleAuthorization({
      userId: userData.user.id,
      authorizationCode,
      expectedAppleSubject,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Atlas Apple authorization token storage failed", {
      error: error instanceof Error ? error.message.split(":")[0] : "unknown",
    });
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
