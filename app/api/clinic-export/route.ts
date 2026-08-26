import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "@/lib/appointments";
import {
  buildClinicArchive,
  clinicAppointmentsCsvFilename,
  clinicArchiveFilename,
  clinicReadableReportFilename,
  CLINIC_EXPORT_MAX_ACTIVITY_EVENTS,
  CLINIC_EXPORT_MAX_APPOINTMENTS,
  CLINIC_EXPORT_MAX_BYTES,
  CLINIC_EXPORT_MAX_WAITLIST_ROWS,
  serializeClinicAppointmentsCsv,
  serializeClinicArchive,
  serializeClinicReadableHtml,
  type ClinicExportFormat,
} from "@/lib/clinic-export";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 500;
const MAX_DOCTORS = 500;
const MAX_WORKFLOW_ROWS = 500;

type RowError = { message?: string } | null;
type PageResult<T> = { data: T[] | null; error: RowError };

type DoctorRow = {
  id: string;
  name: string;
  active: boolean;
  display_order: number;
  specialty: string | null;
  receptionist_phone: string | null;
};

type DoctorWorkflowRow = {
  doctor_id: string;
  appointment_interval_minutes: number;
  reminders_enabled: boolean;
  reminder_lead_minutes: number;
  reminder_second_lead_minutes: number | null;
  default_reminder_language: string;
  updated_at: string;
};

type AppointmentRow = {
  id: string;
  patient_name: string;
  patient_phone: string;
  contact_relationship: string;
  doctor_name: string;
  appointment_at: string;
  status: string;
  reminder_status: string;
  reminder_consent: boolean;
  reminder_consent_at: string | null;
  reminder_language: string;
  arrival_signal: string | null;
  arrival_signal_at: string | null;
  voided_at: string | null;
  void_reason: string | null;
  created_at: string;
  updated_at: string;
};

type WaitlistRow = {
  id: string;
  doctor_id: string;
  patient_name: string;
  patient_phone: string;
  reminder_language: string;
  latest_acceptable_at: string;
  contact_consent_at: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type ActivityRow = {
  id: number;
  actor_type: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  reason: string | null;
  occurred_at: string;
  entity_type: string;
};

type ReminderSettingsRow = {
  enabled: boolean;
  lead_minutes: number;
  second_lead_minutes: number | null;
  daily_message_limit: number;
  default_reminder_language: string;
};

class ClinicExportError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}

async function collectRows<T>(
  loadPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  maxRows: number,
  tooManyCode: string,
) {
  const rows: T[] = [];
  while (rows.length <= maxRows) {
    const from = rows.length;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await loadPage(from, to);
    if (error) throw new ClinicExportError("export_data_unavailable", 503);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  if (rows.length > maxRows) throw new ClinicExportError(tooManyCode, 413);
  return rows;
}

function sameOriginRequest(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (origin && origin !== requestOrigin) return false;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return false;
  return true;
}

function parseFormat(value: string): ClinicExportFormat | null {
  if (value === "json" || value === "csv" || value === "html") return value;
  return null;
}

function exportResponseMeta(format: ClinicExportFormat, clinicName: string, generatedAt: string) {
  if (format === "csv") {
    return {
      contentType: "text/csv; charset=utf-8",
      disposition: `attachment; filename="${clinicAppointmentsCsvFilename(clinicName, generatedAt)}"`,
    };
  }
  if (format === "html") {
    return {
      contentType: "text/html; charset=utf-8",
      disposition: `inline; filename="${clinicReadableReportFilename(clinicName, generatedAt)}"`,
    };
  }
  return {
    contentType: "application/json; charset=utf-8",
    disposition: `attachment; filename="${clinicArchiveFilename(clinicName, generatedAt)}"`,
  };
}

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) {
    return NextResponse.json({ error: "cross_origin_request_blocked" }, { status: 403 });
  }

  let clinicId = "";
  let format: ClinicExportFormat | null = null;
  try {
    const form = await request.formData();
    clinicId = String(form.get("clinic_id") ?? "");
    format = parseFormat(String(form.get("format") ?? "json"));
  } catch {
    return NextResponse.json({ error: "invalid_export_request" }, { status: 400 });
  }
  if (!isUuid(clinicId) || !format) {
    return NextResponse.json({ error: "invalid_export_request" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }

  const { data: clinic, error: clinicError } = await supabase
    .from("clinics")
    .select("id, name, created_at, owner_id, appointment_interval_minutes")
    .eq("id", clinicId)
    .maybeSingle();

  if (clinicError) {
    return NextResponse.json({ error: "export_unavailable" }, { status: 503 });
  }
  if (!clinic || clinic.owner_id !== userData.user.id) {
    return NextResponse.json({ error: "clinic_owner_required" }, { status: 403 });
  }

  // The live schema has additive fields/tables newer than the checked-in generated
  // Database type. Keep every query explicitly allowlisted and clinic-scoped until
  // the next full Supabase type refresh; never use the admin/service-role client here.
  const db = supabase as unknown as SupabaseClient<any>;

  const { data: auditId, error: reserveError } = await db.rpc("reserve_clinic_export", {
    p_clinic_id: clinic.id,
    p_format: format,
  });
  if (reserveError || typeof auditId !== "number") {
    const rateLimited = reserveError?.message?.includes("export_rate_limited") === true;
    return NextResponse.json(
      { error: rateLimited ? "export_rate_limited" : "export_unavailable" },
      {
        status: rateLimited ? 429 : 503,
        headers: rateLimited ? { "Retry-After": "3600" } : undefined,
      },
    );
  }

  const failAudit = async (code: string) => {
    await db.rpc("fail_clinic_export", {
      p_export_id: auditId,
      p_failure_code: code,
    });
  };

  try {
    const doctorsPromise = collectRows<DoctorRow>(
      (from, to) => db
        .from("doctors")
        .select("id, name, active, display_order, specialty, receptionist_phone")
        .eq("clinic_id", clinic.id)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
      MAX_DOCTORS,
      "export_too_many_doctors",
    );

    const workflowsPromise = collectRows<DoctorWorkflowRow>(
      (from, to) => db
        .from("doctor_workflow_settings")
        .select("doctor_id, appointment_interval_minutes, reminders_enabled, reminder_lead_minutes, reminder_second_lead_minutes, default_reminder_language, updated_at")
        .eq("clinic_id", clinic.id)
        .order("doctor_id", { ascending: true })
        .range(from, to),
      MAX_WORKFLOW_ROWS,
      "export_too_many_workflows",
    );

    const appointmentsPromise = collectRows<AppointmentRow>(
      (from, to) => db
        .from("appointments")
        .select("id, patient_name, patient_phone, contact_relationship, doctor_name, appointment_at, status, reminder_status, reminder_consent, reminder_consent_at, reminder_language, arrival_signal, arrival_signal_at, voided_at, void_reason, created_at, updated_at")
        .eq("clinic_id", clinic.id)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
      CLINIC_EXPORT_MAX_APPOINTMENTS,
      "export_too_many_appointments",
    );

    const waitlistPromise = collectRows<WaitlistRow>(
      (from, to) => db
        .from("smart_fill_waitlist")
        .select("id, doctor_id, patient_name, patient_phone, reminder_language, latest_acceptable_at, contact_consent_at, status, created_at, updated_at")
        .eq("clinic_id", clinic.id)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
      CLINIC_EXPORT_MAX_WAITLIST_ROWS,
      "export_too_many_waitlist_rows",
    );

    const activityPromise = collectRows<ActivityRow>(
      (from, to) => db
        .from("appointment_audit_events")
        .select("id, actor_type, action, from_status, to_status, reason, occurred_at, entity_type")
        .eq("clinic_id", clinic.id)
        .order("occurred_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
      CLINIC_EXPORT_MAX_ACTIVITY_EVENTS,
      "export_too_many_activity_events",
    );

    const reminderPromise = db
      .from("clinic_reminder_settings")
      .select("enabled, lead_minutes, second_lead_minutes, daily_message_limit, default_reminder_language")
      .eq("clinic_id", clinic.id)
      .maybeSingle() as PromiseLike<{ data: ReminderSettingsRow | null; error: RowError }>;

    const [doctors, workflows, appointments, waitlist, activityHistory, reminderResult] = await Promise.all([
      doctorsPromise,
      workflowsPromise,
      appointmentsPromise,
      waitlistPromise,
      activityPromise,
      reminderPromise,
    ]);

    if (reminderResult.error) throw new ClinicExportError("export_data_unavailable", 503);

    const doctorNames = new Map(doctors.map((doctor) => [doctor.id, doctor.name]));
    const archive = buildClinicArchive({
      generatedAt: new Date().toISOString(),
      clinic: {
        name: clinic.name,
        createdAt: clinic.created_at,
        appointmentIntervalMinutes: clinic.appointment_interval_minutes,
      },
      doctors: doctors.map((doctor) => ({
        name: doctor.name,
        active: doctor.active,
        displayOrder: doctor.display_order,
        specialty: doctor.specialty,
        receptionistPhone: doctor.receptionist_phone,
      })),
      clinicReminderSettings: reminderResult.data ? {
        enabled: reminderResult.data.enabled,
        leadMinutes: reminderResult.data.lead_minutes,
        secondLeadMinutes: reminderResult.data.second_lead_minutes,
        dailyMessageLimit: reminderResult.data.daily_message_limit,
        defaultReminderLanguage: reminderResult.data.default_reminder_language,
      } : null,
      doctorWorkflowSettings: workflows.map((workflow) => ({
        doctorName: doctorNames.get(workflow.doctor_id) ?? "Removed doctor",
        appointmentIntervalMinutes: workflow.appointment_interval_minutes,
        remindersEnabled: workflow.reminders_enabled,
        reminderLeadMinutes: workflow.reminder_lead_minutes,
        reminderSecondLeadMinutes: workflow.reminder_second_lead_minutes,
        defaultReminderLanguage: workflow.default_reminder_language,
        updatedAt: workflow.updated_at,
      })),
      appointments: appointments.map((appointment) => ({
        patientName: appointment.patient_name,
        patientPhone: appointment.patient_phone,
        contactRelationship: appointment.contact_relationship,
        doctorName: appointment.doctor_name,
        appointmentAt: appointment.appointment_at,
        status: appointment.status,
        reminderStatus: appointment.reminder_status,
        reminderConsent: appointment.reminder_consent,
        reminderConsentAt: appointment.reminder_consent_at,
        reminderLanguage: appointment.reminder_language,
        arrivalSignal: appointment.arrival_signal,
        arrivalSignalAt: appointment.arrival_signal_at,
        voidedAt: appointment.voided_at,
        voidReason: appointment.void_reason,
        createdAt: appointment.created_at,
        updatedAt: appointment.updated_at,
      })),
      smartFillWaitlist: waitlist.map((row) => ({
        patientName: row.patient_name,
        patientPhone: row.patient_phone,
        doctorName: doctorNames.get(row.doctor_id) ?? "Removed doctor",
        reminderLanguage: row.reminder_language,
        latestAcceptableAt: row.latest_acceptable_at,
        contactConsentAt: row.contact_consent_at,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      activityHistory: activityHistory.map((event) => ({
        actorType: event.actor_type,
        action: event.action,
        fromStatus: event.from_status,
        toStatus: event.to_status,
        reason: event.reason,
        occurredAt: event.occurred_at,
        entityType: event.entity_type,
      })),
    });

    const serialized = format === "csv"
      ? serializeClinicAppointmentsCsv(archive)
      : format === "html"
        ? serializeClinicReadableHtml(archive)
        : serializeClinicArchive(archive);
    if (serialized.byteCount > CLINIC_EXPORT_MAX_BYTES) {
      throw new ClinicExportError("export_too_large", 413);
    }

    const { data: completed, error: completionError } = await db.rpc("complete_clinic_export", {
      p_export_id: auditId,
      p_record_count: serialized.recordCount,
      p_byte_count: serialized.byteCount,
    });
    if (completionError || completed !== true) {
      throw new ClinicExportError("export_audit_failed", 503);
    }

    const meta = exportResponseMeta(format, clinic.name, archive.generatedAt);
    const headers: Record<string, string> = {
      "Content-Type": meta.contentType,
      "Content-Disposition": meta.disposition,
      "Cache-Control": "no-store, private",
      "Pragma": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Referrer-Policy": "no-referrer",
    };
    if (format === "html") {
      headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
    }

    return new Response(serialized.text, { status: 200, headers });
  } catch (error) {
    const exportError = error instanceof ClinicExportError
      ? error
      : new ClinicExportError("export_failed", 503);
    await failAudit(exportError.code);
    return NextResponse.json({ error: exportError.code }, {
      status: exportError.status,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
