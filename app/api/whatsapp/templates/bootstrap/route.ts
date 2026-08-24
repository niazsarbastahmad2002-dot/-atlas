import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { withExplicitMetaWabaCandidate } from "@/lib/reminders/meta-explicit-waba";
import { auditMetaWhatsAppReadiness } from "@/lib/reminders/meta-readiness";
import { bootstrapAtlasAppointmentReminderTemplates } from "@/lib/reminders/meta-template-bootstrap";
import {
  ATLAS_PATIENT_CONFIRM_TEMPLATE,
  ATLAS_PATIENT_DAY_TEMPLATE,
  ATLAS_PATIENT_LOOP_REQUIRED_LANGUAGES,
} from "@/lib/reminders/patient-loop";
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

  const metaFetch = withExplicitMetaWabaCandidate(wabaId);
  const audits = await Promise.all([
    auditMetaWhatsAppReadiness({
      accessToken: config.accessToken,
      phoneNumberId: config.phoneNumberId,
      graphApiVersion: config.graphApiVersion,
      expectedTemplateName: ATLAS_PATIENT_CONFIRM_TEMPLATE,
      expectedLanguages: [...ATLAS_PATIENT_LOOP_REQUIRED_LANGUAGES],
      fetchImplementation: metaFetch,
    }),
    auditMetaWhatsAppReadiness({
      accessToken: config.accessToken,
      phoneNumberId: config.phoneNumberId,
      graphApiVersion: config.graphApiVersion,
      expectedTemplateName: ATLAS_PATIENT_DAY_TEMPLATE,
      expectedLanguages: [...ATLAS_PATIENT_LOOP_REQUIRED_LANGUAGES],
      fetchImplementation: metaFetch,
    }),
  ]);

  if (audits.some((audit) => !audit.wabaIds.includes(wabaId))) {
    return NextResponse.json({
      ok: false,
      providers: [{ templateName: "atlas_patient_loop", wabaId, error: "waba_phone_mismatch", variants: [] }],
    }, { headers: { "Cache-Control": "no-store" } });
  }

  const existingTemplates = audits.flatMap((audit) => audit.templates);
  const variants = await bootstrapAtlasAppointmentReminderTemplates({
    accessToken: config.accessToken,
    graphApiVersion: config.graphApiVersion,
    wabaId,
    existingTemplates,
    fetchImplementation: metaFetch,
  });
  const provider = {
    templateName: "atlas_patient_loop",
    wabaId,
    error: null,
    variants,
  };

  return NextResponse.json({
    ok: variants.every((variant) => variant.errorCode === null),
    providers: [provider],
  }, { headers: { "Cache-Control": "no-store" } });
}
