import { NextResponse } from "next/server";
import type { MetaTemplateStatus } from "@/lib/reminders/meta-readiness";
import { readClinicMetaWhatsAppConfig } from "@/lib/reminders/meta-clinic-config";
import { bootstrapMetaSupportTemplates } from "@/lib/reminders/meta-support-templates";
import { bootstrapAtlasAppointmentReminderTemplates } from "@/lib/reminders/meta-template-bootstrap";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type BootstrapBody = { clinicId?: unknown };

async function listTemplates(
  accessToken: string,
  graphApiVersion: string,
  wabaId: string,
): Promise<MetaTemplateStatus[] | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(
      `https://graph.facebook.com/${graphApiVersion}/${wabaId}/message_templates?fields=name,status,language,category&limit=100`,
      {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
        signal: controller.signal,
        cache: "no-store",
      },
    );
    if (!response.ok) return null;
    const body = await response.json() as { data?: unknown };
    if (!Array.isArray(body.data)) return [];
    return body.data.flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const row = raw as Record<string, unknown>;
      if (typeof row.name !== "string" || typeof row.language !== "string" || typeof row.status !== "string") return [];
      return [{
        name: row.name,
        language: row.language,
        status: row.status.toUpperCase(),
        category: typeof row.category === "string" ? row.category.toUpperCase() : null,
      }];
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

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

  const existingTemplates = await listTemplates(
    connection.config.accessToken,
    connection.config.graphApiVersion,
    connection.wabaId,
  );
  if (!existingTemplates) {
    return NextResponse.json({ error: "template_list_failed" }, {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const [patientLoop, support] = await Promise.all([
    bootstrapAtlasAppointmentReminderTemplates({
      accessToken: connection.config.accessToken,
      graphApiVersion: connection.config.graphApiVersion,
      wabaId: connection.wabaId,
      existingTemplates,
    }),
    bootstrapMetaSupportTemplates({
      accessToken: connection.config.accessToken,
      graphApiVersion: connection.config.graphApiVersion,
      wabaId: connection.wabaId,
      existingTemplates,
    }),
  ]);

  const variants = [...patientLoop, ...support];
  return NextResponse.json({
    ok: variants.every((variant) => variant.errorCode === null),
    clinicId: body.clinicId,
    provider: "meta",
    patientLoop,
    support,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
