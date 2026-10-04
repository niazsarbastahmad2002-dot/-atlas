import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const iraqiPhonePattern = /^\+9647\d{9}$/;

function response(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.match(/^Bearer\s+([^\s]+)$/i)?.[1] ?? null;
}

export async function GET(request: Request) {
  const token = bearerToken(request);
  if (!token) return response({ status: "verification_required" }, 401);

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return response({ status: "not_ready" }, 503);
  }

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData.user;
  const verifiedPhone = user?.phone?.startsWith("+")
    ? user.phone
    : user?.phone
      ? `+${user.phone}`
      : "";

  if (
    userError
    || !user
    || !user.phone_confirmed_at
    || !iraqiPhonePattern.test(verifiedPhone)
  ) {
    return response({ status: "verification_required" }, 401);
  }

  const { data: profile, error } = await admin
    .from("patient_profiles")
    .select("display_name, preferred_language")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Atlas patient profile lookup failed", { code: error.code });
    return response({ status: "failed" }, 500);
  }

  return response({
    status: "ok",
    profile: profile
      ? {
          displayName: profile.display_name,
          preferredLanguage: profile.preferred_language,
        }
      : null,
  }, 200);
}
