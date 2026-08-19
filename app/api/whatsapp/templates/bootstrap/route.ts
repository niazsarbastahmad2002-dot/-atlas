import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { withExplicitMetaWabaCandidate } from "@/lib/reminders/meta-explicit-waba";
import { auditMetaWhatsAppReadiness } from "@/lib/reminders/meta-readiness";
import {
  ATLAS_APPOINTMENT_REMINDER_TEMPLATE,
  bootstrapAtlasAppointmentReminderTemplates,
} from "@/lib/reminders/meta-template-bootstrap";
import { readWhatsAppConfig } from "@/lib/reminders/whatsapp";
import { constantTimeEqual } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type AdminClient = ReturnType<typeof createAdminClient>;
type SchedulerTokenRpcClient = {
  rpc: (
    fn: "consume_reminder_scheduler_token",
    args: { p_token_hash: string },
  ) => Promise<{ data: boolean | null; error: { code?: string } | null }>;
};

type ReminderSetting = { template_name: string };

async function authorized(request: Request, admin: AdminClient) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;

  const token = header.slice(7);
  const staticSecret = process.env.CRON_SECRET?.trim();
  if (staticSecret && constantTimeEqual(token, staticSecret)) return true;

  if (!/^[a-f0-9]{64}$/i.test(token)) return false;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const schedulerClient = admin as unknown as SchedulerTokenRpcClient;
  const { data, error } = await schedulerClient.rpc("consume_reminder_scheduler_token", {
    p_token_hash: tokenHash,
  });
  return !error && data === true;
}

export async function POST(request: Request) {
  let admin: AdminClient;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "service_not_configured" }, { status: 503 });
  }

  if (!(await authorized(request, admin))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let wabaId = "";
  try {
    const body = await request.json() as { wabaId?: unknown };
    if (typeof body.wabaId !== "string" || !/^\d{5,32}$/.test(body.wabaId)) {
      return NextResponse.json({ error: "invalid_waba_id" }, { status: 400 });
    }
    wabaId = body.wabaId;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  let config: NonNullable<ReturnType<typeof readWhatsAppConfig>>;
  try {
    const value = readWhatsAppConfig();
    if (!value) return NextResponse.json({ error: "whatsapp_disabled" }, { status: 503 });
    config = value;
  } catch {
    return NextResponse.json({ error: "service_not_configured" }, { status: 503 });
  }

  const db = admin as any;
  const { data, error } = await db.from("clinic_reminder_settings")
    .select("template_name")
    .order("template_name", { ascending: true });
  if (error || !Array.isArray(data)) {
    return NextResponse.json({ error: "settings_unavailable" }, { status: 500 });
  }

  const templateNames = [...new Set(
    (data as ReminderSetting[]).map((row) => row.template_name).filter(Boolean),
  )];
  if (!templateNames.length) {
    return NextResponse.json({ error: "settings_unavailable" }, { status: 404 });
  }

  const metaFetch = withExplicitMetaWabaCandidate(wabaId);
  const providers = [];
  for (const templateName of templateNames) {
    if (templateName !== ATLAS_APPOINTMENT_REMINDER_TEMPLATE) {
      providers.push({ templateName, wabaId, error: "unsupported_template", variants: [] });
      continue;
    }

    const audit = await auditMetaWhatsAppReadiness({
      accessToken: config.accessToken,
      phoneNumberId: config.phoneNumberId,
      graphApiVersion: config.graphApiVersion,
      expectedTemplateName: templateName,
      fetchImplementation: metaFetch,
    });

    if (!audit.wabaIds.includes(wabaId)) {
      providers.push({
        templateName,
        wabaId,
        error: "waba_phone_mismatch",
        variants: [],
      });
      continue;
    }

    const variants = await bootstrapAtlasAppointmentReminderTemplates({
      accessToken: config.accessToken,
      graphApiVersion: config.graphApiVersion,
      wabaId,
      existingTemplates: audit.templates,
    });
    providers.push({ templateName, wabaId, error: null, variants });
  }

  return NextResponse.json({
    ok: providers.every((provider) => provider.error === null
      && provider.variants.every((variant) => variant.errorCode === null)),
    providers,
  }, { headers: { "Cache-Control": "no-store" } });
}
