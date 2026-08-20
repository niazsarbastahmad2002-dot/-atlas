import { NextResponse } from "next/server";
import { completeMetaCoexistence } from "@/lib/reminders/meta-coexistence-completion";
import { readMetaEmbeddedSignupReadiness } from "@/lib/reminders/meta-embedded-signup";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const idPattern = /^\d{5,32}$/;
const codePattern = /^[A-Za-z0-9._-]{16,4096}$/;

type CompletionBody = {
  clinicId?: unknown;
  code?: unknown;
  wabaId?: unknown;
  phoneNumberId?: unknown;
  businessId?: unknown;
};

function validOptionalId(value: unknown) {
  return value == null || (typeof value === "string" && idPattern.test(value));
}

export async function POST(request: Request) {
  const declared = request.headers.get("content-length");
  if (declared !== null) {
    const bytes = Number(declared);
    if (!Number.isSafeInteger(bytes) || bytes < 0) {
      return NextResponse.json({ error: "invalid_length" }, { status: 400 });
    }
    if (bytes > 20_000) return NextResponse.json({ error: "request_too_large" }, { status: 413 });
  }

  let body: CompletionBody;
  try {
    const raw = await request.text();
    if (raw.length > 20_000) return NextResponse.json({ error: "request_too_large" }, { status: 413 });
    body = JSON.parse(raw) as CompletionBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (
    typeof body.clinicId !== "string"
    || !uuidPattern.test(body.clinicId)
    || typeof body.code !== "string"
    || !codePattern.test(body.code)
    || typeof body.wabaId !== "string"
    || !idPattern.test(body.wabaId)
    || typeof body.phoneNumberId !== "string"
    || !idPattern.test(body.phoneNumberId)
    || !validOptionalId(body.businessId)
  ) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = supabase as any;
  const [{ data: clinic }, { data: membership }] = await Promise.all([
    db.from("clinics").select("id, owner_id").eq("id", body.clinicId).maybeSingle(),
    db.from("clinic_members").select("role").eq("clinic_id", body.clinicId).eq("user_id", userData.user.id).maybeSingle(),
  ]);
  if (!clinic) return NextResponse.json({ error: "unavailable" }, { status: 404 });

  const administrative = clinic.owner_id === userData.user.id
    || membership?.role === "owner"
    || membership?.role === "manager";
  if (!administrative) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const readiness = readMetaEmbeddedSignupReadiness();
  if (!readiness.configured || !readiness.appId || !readiness.graphApiVersion) {
    return NextResponse.json({
      error: "embedded_signup_not_ready",
      blockers: readiness.blockers,
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim() ?? "";
  const completion = await completeMetaCoexistence({
    code: body.code,
    wabaId: body.wabaId,
    phoneNumberId: body.phoneNumberId,
    businessId: typeof body.businessId === "string" ? body.businessId : null,
  }, {
    appId: readiness.appId,
    appSecret,
    graphApiVersion: readiness.graphApiVersion,
  });

  if (!completion.connected) {
    return NextResponse.json({ error: completion.errorCode }, {
      status: completion.errorCode === "test_sender_number" ? 409 : 502,
      headers: { "Cache-Control": "no-store" },
    });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try { admin = createAdminClient(); } catch {
    return NextResponse.json({ error: "service_not_configured" }, { status: 503 });
  }

  const adminDb = admin as any;
  const { data: stored, error: storeError } = await adminDb.rpc("store_meta_whatsapp_connection", {
    p_clinic_id: body.clinicId,
    p_waba_id: completion.wabaId,
    p_phone_number_id: completion.phoneNumberId,
    p_business_id: completion.businessId,
    p_display_phone_number: completion.displayPhoneNumber,
    p_verified_name: completion.verifiedName,
    p_access_token: completion.accessToken,
  });
  if (storeError || stored !== true) {
    console.error("Atlas WhatsApp connection store failed", { code: storeError?.code ?? "rejected" });
    return NextResponse.json({ error: "connection_store_failed" }, { status: 500 });
  }

  return NextResponse.json({
    connected: true,
    provider: "meta",
    mode: "coexistence",
    wabaId: completion.wabaId,
    phoneNumberId: completion.phoneNumberId,
    displayPhoneNumber: completion.displayPhoneNumber,
    verifiedName: completion.verifiedName,
  }, { headers: { "Cache-Control": "no-store" } });
}
