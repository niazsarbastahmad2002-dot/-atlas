import { NextResponse } from "next/server";
import { readClinicMetaWhatsAppConfig } from "@/lib/reminders/meta-clinic-config";
import { bootstrapAtlasMetaTemplateSuite } from "@/lib/reminders/meta-template-suite";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type BootstrapBody = { clinicId?: unknown };

export async function POST(request: Request) {
  let body: BootstrapBody;
  try {
    const raw = await request.text();
    if (raw.length > 10_000) return NextResponse.json({ error: "request_too_large" }, { status: 413 });
    body = JSON.parse(raw) as BootstrapBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (typeof body.clinicId !== "string" || !uuidPattern.test(body.clinicId)) {
    return NextResponse.json({ error: "invalid_clinic_id" }, { status: 400 });
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

  let admin: ReturnType<typeof createAdminClient>;
  try { admin = createAdminClient(); } catch {
    return NextResponse.json({ error: "service_not_configured" }, { status: 503 });
  }

  const connection = await readClinicMetaWhatsAppConfig(admin, body.clinicId);
  if (!connection) {
    return NextResponse.json({ error: "whatsapp_connection_missing" }, {
      status: 409,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const suite = await bootstrapAtlasMetaTemplateSuite({
    accessToken: connection.config.accessToken,
    graphApiVersion: connection.config.graphApiVersion,
    wabaId: connection.wabaId,
  });

  return NextResponse.json({
    ...suite,
    clinicId: body.clinicId,
    provider: "meta",
  }, {
    status: suite.error === "template_list_failed" ? 502 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
