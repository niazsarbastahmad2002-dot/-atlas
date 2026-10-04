import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { issuePatientAccountSession, setPatientAccountCookie } from "@/lib/patient-account-session";
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

export async function POST(request: Request) {
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

  const bucketHash = createHash("sha256")
    .update(`patient-account-session:${user.id}`)
    .digest("hex");
  const { data: allowed, error: limitError } = await admin.rpc(
    "consume_patient_link_rate_limit",
    { p_bucket_hash: bucketHash },
  );
  if (limitError || allowed !== true) {
    return response({ status: "rate_limited" }, 429);
  }

  const session = await issuePatientAccountSession(admin, user.id);
  if (!session) return response({ status: "failed" }, 500);

  const result = response({ status: "ok" }, 200);
  setPatientAccountCookie(result, session.token, session.expiresAt);
  return result;
}
