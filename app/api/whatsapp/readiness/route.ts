import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { readClinicMetaWhatsAppConfig } from "@/lib/reminders/meta-clinic-config";
import { withExplicitMetaWabaCandidate } from "@/lib/reminders/meta-explicit-waba";
import {
  auditMetaWhatsAppReadiness,
  type MetaWhatsAppReadiness,
} from "@/lib/reminders/meta-readiness";
import {
  ATLAS_PATIENT_CONFIRM_TEMPLATE,
  ATLAS_PATIENT_DAY_TEMPLATE,
  ATLAS_PATIENT_LOOP_REQUIRED_LANGUAGES,
} from "@/lib/reminders/patient-loop";
import { readWhatsAppConfig, type WhatsAppConfig } from "@/lib/reminders/whatsapp";
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

type ClinicAudit = MetaWhatsAppReadiness & {
  clinicId: string;
  templateName: string;
  connectionSource: "coexistence" | "legacy_env" | "missing";
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

function unavailableAudit(clinicId: string): ClinicAudit {
  return {
    clinicId,
    templateName: "atlas_patient_loop",
    connectionSource: "missing",
    ready: false,
    nameStatus: null,
    verifiedName: null,
    displayPhoneNumber: null,
    qualityRating: null,
    businessCount: 0,
    wabaCount: 0,
    wabaIds: [],
    tokenScopes: [],
    wabaReviewStatuses: [],
    templates: [],
    blockers: ["whatsapp_connection_missing"],
  };
}

function templateAwareBlockers(prefix: "confirm" | "day", audit: MetaWhatsAppReadiness) {
  return audit.blockers.map((blocker) => (
    blocker.startsWith("template_") ? `${prefix}_${blocker}` : blocker
  ));
}

function combineAudits(
  clinicId: string,
  connectionSource: ClinicAudit["connectionSource"],
  confirm: MetaWhatsAppReadiness,
  day: MetaWhatsAppReadiness,
): ClinicAudit {
  return {
    ...confirm,
    clinicId,
    templateName: "atlas_patient_loop",
    connectionSource,
    ready: confirm.ready && day.ready,
    templates: [...confirm.templates, ...day.templates]
      .filter((template, index, all) => all.findIndex((item) => item.name === template.name && item.language === template.language) === index)
      .sort((left, right) => `${left.name}:${left.language}`.localeCompare(`${right.name}:${right.language}`)),
    blockers: [...new Set([
      ...templateAwareBlockers("confirm", confirm),
      ...templateAwareBlockers("day", day),
    ])],
  };
}

async function auditPatientLoop(
  accessToken: string,
  phoneNumberId: string,
  graphApiVersion: string,
  fetchImplementation: typeof fetch,
) {
  return Promise.all([
    auditMetaWhatsAppReadiness({
      accessToken,
      phoneNumberId,
      graphApiVersion,
      expectedTemplateName: ATLAS_PATIENT_CONFIRM_TEMPLATE,
      expectedLanguages: [...ATLAS_PATIENT_LOOP_REQUIRED_LANGUAGES],
      fetchImplementation,
    }),
    auditMetaWhatsAppReadiness({
      accessToken,
      phoneNumberId,
      graphApiVersion,
      expectedTemplateName: ATLAS_PATIENT_DAY_TEMPLATE,
      expectedLanguages: [...ATLAS_PATIENT_LOOP_REQUIRED_LANGUAGES],
      fetchImplementation,
    }),
  ]);
}

function readLegacyDiagnosticConfig(): WhatsAppConfig | null {
  try { return readWhatsAppConfig(); } catch { return null; }
}

async function auditClinic(
  admin: AdminClient,
  row: ReminderSetting,
  legacyConfig: WhatsAppConfig | null,
  requestedWabaId: string | undefined,
): Promise<ClinicAudit> {
  const connection = await readClinicMetaWhatsAppConfig(admin, row.clinic_id);
  if (connection) {
    const [confirm, day] = await auditPatientLoop(
      connection.config.accessToken,
      connection.config.phoneNumberId,
      connection.config.graphApiVersion,
      withExplicitMetaWabaCandidate(connection.wabaId),
    );
    return combineAudits(row.clinic_id, "coexistence", confirm, day);
  }

  if (!legacyConfig) return unavailableAudit(row.clinic_id);
  const [confirm, day] = await auditPatientLoop(
    legacyConfig.accessToken,
    legacyConfig.phoneNumberId,
    legacyConfig.graphApiVersion,
    withExplicitMetaWabaCandidate(requestedWabaId),
  );
  return combineAudits(row.clinic_id, "legacy_env", confirm, day);
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
  let wabaId: string | undefined;
  try {
    const body = await request.json() as { activate?: unknown; wabaId?: unknown };
    activate = body.activate === true;
    if (body.wabaId !== undefined) {
      if (typeof body.wabaId !== "string" || !/^\d{5,32}$/.test(body.wabaId)) {
        return NextResponse.json({ error: "invalid_waba_id" }, { status: 400 });
      }
      wabaId = body.wabaId;
    }
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const legacyConfig = readLegacyDiagnosticConfig();
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

  const audits: ClinicAudit[] = [];
  for (const row of settings) {
    audits.push(await auditClinic(admin, row, legacyConfig, wabaId));
  }

  const checkedAt = new Date().toISOString();
  let activated = false;
  if (activate) {
    for (const row of settings) {
      const audit = audits.find((item) => item.clinicId === row.clinic_id);
      if (!audit) continue;
      // Production activation requires the clinic-scoped Coexistence sender and
      // both Patient Loop templates in every required provider language.
      const canActivate = audit.connectionSource === "coexistence" && audit.ready;
      const patch = canActivate
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
            meta_template_error_code: safeBlocker(
              audit.connectionSource === "coexistence"
                ? audit.blockers[0]
                : "whatsapp_connection_missing",
              row.meta_template_error_code,
            ),
          };
      const { error: updateError } = await db.from("clinic_reminder_settings")
        .update(patch)
        .eq("clinic_id", row.clinic_id);
      if (updateError) {
        console.error("Atlas Meta readiness state update failed", { code: updateError.code ?? "unknown" });
        return NextResponse.json({ error: "activation_write_failed" }, { status: 500 });
      }
    }
    activated = audits.length > 0
      && audits.every((audit) => audit.connectionSource === "coexistence" && audit.ready);
  }

  const ready = audits.length > 0
    && audits.every((audit) => audit.connectionSource === "coexistence" && audit.ready);

  return NextResponse.json({
    ready,
    activated,
    providers: audits.map((audit) => ({
      clinicId: audit.clinicId,
      templateName: audit.templateName,
      connectionSource: audit.connectionSource,
      nameStatus: audit.nameStatus,
      verifiedName: audit.verifiedName,
      displayPhoneNumber: audit.displayPhoneNumber,
      qualityRating: audit.qualityRating,
      businessCount: audit.businessCount,
      wabaCount: audit.wabaCount,
      wabaIds: audit.wabaIds,
      tokenScopes: audit.tokenScopes,
      wabaReviewStatuses: audit.wabaReviewStatuses,
      templates: audit.templates,
      blockers: audit.blockers,
    })),
  }, { headers: { "Cache-Control": "no-store" } });
}
