import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { auditMetaWhatsAppReadiness } from "@/lib/reminders/meta-readiness";
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

type ReminderSetting = {
  clinic_id: string;
  template_name: string;
  messaging_approved_at: string | null;
  meta_template_error_code: string | null;
};

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

function safeBlocker(value: string | undefined, fallback: string | null) {
  const candidate = value || fallback || "provider_not_ready";
  return /^[a-z0-9_]{1,96}$/i.test(candidate) ? candidate : "provider_not_ready";
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

  let activate = false;
  try {
    const body = await request.json() as { activate?: unknown };
    activate = body.activate === true;
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
    .select("clinic_id, template_name, messaging_approved_at, meta_template_error_code")
    .order("clinic_id", { ascending: true });
  if (error || !Array.isArray(data)) {
    return NextResponse.json({ error: "settings_unavailable" }, { status: 500 });
  }

  const settings = data as ReminderSetting[];
  if (!settings.length) {
    return NextResponse.json({ error: "settings_unavailable" }, { status: 404 });
  }

  const templateNames = [...new Set(settings.map((row) => row.template_name).filter(Boolean))];
  const audits = [];
  for (const templateName of templateNames) {
    const result = await auditMetaWhatsAppReadiness({
      accessToken: config.accessToken,
      phoneNumberId: config.phoneNumberId,
      graphApiVersion: config.graphApiVersion,
      expectedTemplateName: templateName,
    });
    audits.push({ templateName, ...result });
  }

  const checkedAt = new Date().toISOString();
  let activated = false;
  if (activate) {
    for (const row of settings) {
      const audit = audits.find((item) => item.templateName === row.template_name);
      if (!audit) continue;
      const patch = audit.ready
        ? {
            enabled: true,
            messaging_approved_at: row.messaging_approved_at ?? checkedAt,
            meta_template_checked_at: checkedAt,
            meta_template_status: "approved",
            meta_template_error_code: null,
          }
        : {
            enabled: false,
            messaging_approved_at: null,
            meta_template_checked_at: checkedAt,
            meta_template_status: "blocked",
            meta_template_error_code: safeBlocker(audit.blockers[0], row.meta_template_error_code),
          };
      const { error: updateError } = await db.from("clinic_reminder_settings")
        .update(patch)
        .eq("clinic_id", row.clinic_id);
      if (updateError) {
        console.error("Atlas Meta readiness state update failed", { code: updateError.code ?? "unknown" });
        return NextResponse.json({ error: "activation_write_failed" }, { status: 500 });
      }
    }
    activated = audits.length > 0 && audits.every((audit) => audit.ready);
  }

  return NextResponse.json({
    ready: audits.length > 0 && audits.every((audit) => audit.ready),
    activated,
    providers: audits.map((audit) => ({
      templateName: audit.templateName,
      nameStatus: audit.nameStatus,
      verifiedName: audit.verifiedName,
      displayPhoneNumber: audit.displayPhoneNumber,
      qualityRating: audit.qualityRating,
      wabaCount: audit.wabaCount,
      wabaReviewStatuses: audit.wabaReviewStatuses,
      templates: audit.templates,
      blockers: audit.blockers,
    })),
  }, { headers: { "Cache-Control": "no-store" } });
}
