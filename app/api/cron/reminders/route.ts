import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { baghdadDateTime } from "@/lib/i18n/config";
import {
  readWhatsAppConfig,
  sendApprovedWhatsAppTemplate,
} from "@/lib/reminders/whatsapp";
import { constantTimeEqual } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ClaimedReminder = {
  reminder_id: string;
  patient_phone: string;
  clinic_name: string;
  appointment_at: string;
  template_name: string;
  template_language: string;
};

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const header = request.headers.get("authorization");
  return Boolean(secret && header?.startsWith("Bearer ") && constantTimeEqual(header.slice(7), secret));
}

async function processReminder(
  admin: ReturnType<typeof createAdminClient>,
  workerId: string,
  reminder: ClaimedReminder,
  config: NonNullable<ReturnType<typeof readWhatsAppConfig>>,
) {
  if (
    !reminder.reminder_id
    || !/^\+9647\d{9}$/.test(reminder.patient_phone)
    || !reminder.clinic_name
    || Number.isNaN(new Date(reminder.appointment_at).getTime())
    || !/^[a-z0-9_]{1,512}$/.test(reminder.template_name)
    || !/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(reminder.template_language)
  ) {
    await admin.rpc("fail_whatsapp_reminder", {
      p_reminder_id: reminder.reminder_id,
      p_worker_id: workerId,
      p_error_code: "invalid_job",
      p_retryable: false,
    });
    return "failed" as const;
  }

  const { data: claimIsCurrent, error: validationError } = await admin.rpc(
    "validate_whatsapp_reminder_claim",
    { p_reminder_id: reminder.reminder_id, p_worker_id: workerId },
  );
  if (validationError || claimIsCurrent !== true) {
    await admin.rpc("fail_whatsapp_reminder", {
      p_reminder_id: reminder.reminder_id,
      p_worker_id: workerId,
      p_error_code: "stale_claim",
      p_retryable: false,
    });
    return "stale" as const;
  }

  const result = await sendApprovedWhatsAppTemplate({
    recipientPhone: reminder.patient_phone,
    clinicName: reminder.clinic_name,
    appointmentAt: baghdadDateTime.format(new Date(reminder.appointment_at)),
    templateName: reminder.template_name,
    templateLanguage: reminder.template_language,
  }, config);

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

  const { error } = await admin.rpc("fail_whatsapp_reminder", {
    p_reminder_id: reminder.reminder_id,
    p_worker_id: workerId,
    p_error_code: result.errorCode,
    p_retryable: result.retryable,
  });
  if (error) console.error("Atlas reminder failure write failed", { code: error.code });
  return result.retryable ? "retry" as const : "failed" as const;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let config: NonNullable<ReturnType<typeof readWhatsAppConfig>>;
  let admin: ReturnType<typeof createAdminClient>;
  try {
    const configured = readWhatsAppConfig();
    if (!configured) return NextResponse.json({ error: "whatsapp_disabled" }, { status: 503 });
    config = configured;
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "service_not_configured" }, { status: 503 });
  }

  const workerId = randomUUID();
  const { data, error } = await admin.rpc("claim_due_whatsapp_reminders", {
    p_worker_id: workerId,
    p_limit: 25,
    p_global_daily_limit: config.globalDailyLimit,
  });

  if (error) {
    console.error("Atlas reminder claim failed", { code: error.code });
    return NextResponse.json({ error: "claim_failed" }, { status: 500 });
  }

  const reminders = Array.isArray(data) ? data as ClaimedReminder[] : [];
  const results = await Promise.all(reminders.map((reminder) => processReminder(admin, workerId, reminder, config)));
  const counts = results.reduce<Record<string, number>>((totals, result) => {
    totals[result] = (totals[result] ?? 0) + 1;
    return totals;
  }, {});

  return NextResponse.json({ claimed: reminders.length, ...counts }, {
    headers: { "Cache-Control": "no-store" },
  });
}
