import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { baghdadDateTime } from "@/lib/i18n/config";
import {
  createD360WhatsAppReminderTransport,
  createInfobipWhatsAppReminderTransport,
  createWhatsAppReminderTransport,
  routeReminder,
  type ReminderTransport,
} from "@/lib/reminders/delivery";
import { readD360WhatsAppConfig } from "@/lib/reminders/d360";
import { readInfobipWhatsAppConfig } from "@/lib/reminders/infobip";
import {
  readClinicMetaWhatsAppConfig,
  readMetaRuntimeBase,
} from "@/lib/reminders/meta-clinic-config";
import type { PatientLoopMessageKind } from "@/lib/reminders/patient-loop";
import { constantTimeEqual } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ClaimedReminder = {
  reminder_id: string;
  appointment_id: string;
  clinic_id: string;
  patient_phone: string;
  clinic_name: string;
  doctor_name: string;
  appointment_at: string;
  scheduled_for: string;
  template_name: string;
  template_language: string;
  message_kind: PatientLoopMessageKind;
  delay_minutes: number;
};

type AdminClient = ReturnType<typeof createAdminClient>;

type SchedulerTokenRpcClient = {
  rpc: (
    fn: "consume_reminder_scheduler_token",
    args: { p_token_hash: string },
  ) => Promise<{ data: boolean | null; error: { code?: string } | null }>;
};

type ConfiguredProvider = {
  provider: "meta" | "infobip" | "360dialog";
  globalDailyLimit: number;
  transport: ReminderTransport | null;
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

function configuredWhatsAppProvider(): ConfiguredProvider | null {
  if (process.env.WHATSAPP_ENABLED !== "true") return null;
  const provider = process.env.WHATSAPP_PROVIDER?.trim().toLowerCase() || "meta";

  if (provider === "infobip") {
    const config = readInfobipWhatsAppConfig();
    if (!config) return null;
    return {
      provider,
      transport: createInfobipWhatsAppReminderTransport(config),
      globalDailyLimit: config.globalDailyLimit,
    };
  }

  if (provider === "360dialog") {
    const config = readD360WhatsAppConfig();
    if (!config) return null;
    return {
      provider,
      transport: createD360WhatsAppReminderTransport(config),
      globalDailyLimit: config.globalDailyLimit,
    };
  }

  if (provider !== "meta") throw new Error("Unsupported WhatsApp provider.");
  const base = readMetaRuntimeBase();
  if (!base) return null;
  return {
    provider: "meta",
    transport: null,
    globalDailyLimit: base.globalDailyLimit,
  };
}

async function resolveReminderTransport(
  admin: AdminClient,
  configured: ConfiguredProvider,
  reminder: ClaimedReminder,
) {
  if (configured.provider !== "meta") return configured.transport;
  const clinicConfig = await readClinicMetaWhatsAppConfig(admin, reminder.clinic_id);
  return clinicConfig ? createWhatsAppReminderTransport(clinicConfig.config) : null;
}

async function failReminder(
  admin: AdminClient,
  workerId: string,
  reminderId: string,
  errorCode: string,
  retryable = false,
) {
  const { error } = await admin.rpc("fail_whatsapp_reminder", {
    p_reminder_id: reminderId,
    p_worker_id: workerId,
    p_error_code: errorCode,
    p_retryable: retryable,
  });
  if (error) console.error("Atlas reminder failure write failed", { code: error.code });
}

async function processReminder(
  admin: AdminClient,
  workerId: string,
  reminder: ClaimedReminder,
  configured: ConfiguredProvider,
) {
  if (
    !/^[0-9a-f-]{36}$/i.test(reminder.reminder_id)
    || !/^[0-9a-f-]{36}$/i.test(reminder.appointment_id)
    || !/^[0-9a-f-]{36}$/i.test(reminder.clinic_id)
    || !/^\+9647\d{9}$/.test(reminder.patient_phone)
    || !reminder.clinic_name
    || !reminder.doctor_name
    || Number.isNaN(new Date(reminder.appointment_at).getTime())
    || Number.isNaN(new Date(reminder.scheduled_for).getTime())
    || !/^[a-z0-9_]{1,512}$/.test(reminder.template_name)
    || !/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(reminder.template_language)
    || !["confirm", "day_of"].includes(reminder.message_kind)
    || !Number.isInteger(reminder.delay_minutes)
    || reminder.delay_minutes < -15
    || reminder.delay_minutes > 120
  ) {
    await failReminder(admin, workerId, reminder.reminder_id, "invalid_job");
    return "failed" as const;
  }

  const { data: claimIsCurrent, error: validationError } = await admin.rpc(
    "validate_whatsapp_reminder_claim",
    { p_reminder_id: reminder.reminder_id, p_worker_id: workerId },
  );
  if (validationError || claimIsCurrent !== true) {
    await failReminder(admin, workerId, reminder.reminder_id, "stale_claim");
    return "stale" as const;
  }

  const transport = await resolveReminderTransport(admin, configured, reminder);
  if (!transport) {
    await failReminder(admin, workerId, reminder.reminder_id, "whatsapp_connection_missing");
    return "failed" as const;
  }

  const result = await routeReminder({
    recipientPhone: reminder.patient_phone,
    clinicName: reminder.clinic_name,
    doctorName: reminder.doctor_name,
    appointmentAt: baghdadDateTime.format(new Date(reminder.appointment_at)),
    reminderId: reminder.reminder_id,
    messageKind: reminder.message_kind,
    delayMinutes: reminder.delay_minutes,
    templateName: reminder.template_name,
    templateLanguage: reminder.template_language,
  }, ["whatsapp"], [transport]);

  if (result.accepted) {
    const { data, error } = await admin.rpc("complete_whatsapp_reminder", {
      p_reminder_id: reminder.reminder_id,
      p_worker_id: workerId,
      p_provider_message_id: result.providerMessageId,
    });
    if (error || data !== true) {
      console.error("Atlas reminder completion write failed", { code: error?.code ?? "stale_claim" });
      return "completion_unknown" as const;
    }
    return "sent" as const;
  }

  await failReminder(
    admin,
    workerId,
    reminder.reminder_id,
    result.errorCode,
    result.retryable,
  );
  return result.retryable ? "retry" as const : "failed" as const;
}

export async function GET(request: Request) {
  let admin: AdminClient;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "service_not_configured" }, { status: 503 });
  }

  if (!(await authorized(request, admin))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let configured: ConfiguredProvider | null;
  try {
    configured = configuredWhatsAppProvider();
    if (!configured) return NextResponse.json({ error: "whatsapp_disabled" }, { status: 503 });
  } catch {
    return NextResponse.json({ error: "service_not_configured" }, { status: 503 });
  }

  const workerId = randomUUID();
  const rpcClient = admin as any;
  const { data, error } = await rpcClient.rpc("claim_due_whatsapp_reminders_v3", {
    p_worker_id: workerId,
    p_limit: 25,
    p_global_daily_limit: configured.globalDailyLimit,
  });

  if (error) {
    console.error("Atlas reminder claim failed", { code: error.code });
    return NextResponse.json({ error: "claim_failed" }, { status: 500 });
  }

  const reminders = Array.isArray(data) ? data as ClaimedReminder[] : [];
  const results = await Promise.all(reminders.map((reminder) => (
    processReminder(admin, workerId, reminder, configured)
  )));
  const counts = results.reduce<Record<string, number>>((totals, result) => {
    totals[result] = (totals[result] ?? 0) + 1;
    return totals;
  }, {});

  return NextResponse.json({ claimed: reminders.length, ...counts }, {
    headers: { "Cache-Control": "no-store" },
  });
}
