"use server";

import { revalidatePath } from "next/cache";
import {
  classifyAppointmentMutationError,
  cleanDisplayName,
  isAppointmentStatus,
  isUuid,
  isValidDisplayName,
  normalizeIraqiMobile,
  parseBaghdadDateTime,
  type AppointmentMutationFailure,
  type AppointmentStatus,
} from "@/lib/appointments";
import { queueAtlasServerEvent } from "@/lib/analytics/server";
import { createClient } from "@/lib/supabase/server";

const reminderLanguages = new Set(["ku", "bd", "ar", "en"]);

export type InlineAppointmentResult =
  | { ok: true; status?: AppointmentStatus; archived?: boolean; updated?: boolean; created?: boolean }
  | { ok: false; reason: AppointmentMutationFailure };

function statusAction(status: AppointmentStatus) {
  if (status === "confirmed") return "confirm" as const;
  if (status === "cancelled") return "cancel" as const;
  if (status === "completed") return "complete" as const;
  if (status === "no_show") return "no_show" as const;
  if (status === "pending") return "pending" as const;
  return null;
}

export async function createAppointmentInline(formData: FormData): Promise<InlineAppointmentResult> {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const idempotencyKey = String(formData.get("idempotency_key") ?? "");
  const rawPatientName = String(formData.get("patient_name") ?? "");
  const patientName = cleanDisplayName(rawPatientName);
  const patientPhone = normalizeIraqiMobile(String(formData.get("patient_phone") ?? ""));
  const doctorId = String(formData.get("doctor_id") ?? "");
  const appointmentAt = parseBaghdadDateTime(String(formData.get("appointment_at") ?? ""));
  const reminderConsent = formData.get("reminder_consent") === "on";
  const reminderLanguage = String(formData.get("reminder_language") ?? "ku");

  if (
    !isUuid(clinicId)
    || !isUuid(doctorId)
    || !isUuid(idempotencyKey)
    || !isValidDisplayName(rawPatientName)
    || !patientPhone
    || !appointmentAt
    || !reminderLanguages.has(reminderLanguage)
  ) {
    queueAtlasServerEvent("atlas_appointment_created", { outcome: "validation", interaction: "form", screen: "schedule", surface: "clinic" });
    return { ok: false, reason: "invalid" };
  }

  // Keep the hot path short. The user's session is already carried by the
  // Supabase client and RLS remains the authority for clinic access. We only
  // resolve the selected active doctor and then insert the appointment.
  const supabase = await createClient();
  const { data: doctor, error: doctorError } = await supabase
    .from("doctors")
    .select("id, name")
    .eq("clinic_id", clinicId)
    .eq("id", doctorId)
    .eq("active", true)
    .maybeSingle();
  if (doctorError || !doctor) {
    queueAtlasServerEvent("atlas_appointment_created", { outcome: "validation", interaction: "form", screen: "schedule", surface: "clinic" });
    return { ok: false, reason: "invalid" };
  }

  const { error } = await supabase.from("appointments").insert({
    clinic_id: clinicId,
    patient_name: patientName,
    patient_phone: patientPhone,
    doctor_name: doctor.name,
    doctor_id: doctor.id,
    appointment_at: appointmentAt.toISOString(),
    idempotency_key: idempotencyKey,
    reminder_consent: reminderConsent,
    reminder_language: reminderLanguage,
  });

  if (error) {
    const reason = classifyAppointmentMutationError(error.code, error.message);
    if (reason === "failed") console.error("Atlas fast appointment creation failed", { code: error.code });
    queueAtlasServerEvent("atlas_appointment_created", {
      outcome: reason === "slot_taken" ? "slot_taken" : "failure",
      interaction: "form",
      screen: "schedule",
      surface: "clinic",
    });
    return { ok: false, reason };
  }

  queueAtlasServerEvent("atlas_appointment_created", { outcome: "success", interaction: "form", screen: "schedule", surface: "clinic" });
  // The dashboard is dynamic. The client paints an optimistic row immediately
  // and refreshes after this returns, so avoid an extra redirect/reload here.
  return { ok: true, created: true };
}

export async function updateAppointmentStatusInline(
  clinicId: string,
  id: string,
  status: string,
): Promise<InlineAppointmentResult> {
  if (!isUuid(clinicId) || !isUuid(id) || !isAppointmentStatus(status)) {
    return { ok: false, reason: "invalid" };
  }

  const action = statusAction(status);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("clinic_id", clinicId)
    .eq("id", id)
    .is("voided_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    const reason = classifyAppointmentMutationError(error.code, error.message);
    if (reason === "failed") console.error("Atlas inline appointment status update failed", { code: error.code });
    if (action) queueAtlasServerEvent("atlas_appointment_status_changed", { status_action: action, outcome: "failure", screen: "schedule", surface: "clinic" });
    return { ok: false, reason };
  }
  if (!data) {
    if (action) queueAtlasServerEvent("atlas_appointment_status_changed", { status_action: action, outcome: "failure", screen: "schedule", surface: "clinic" });
    return { ok: false, reason: "failed" };
  }

  if (action) queueAtlasServerEvent("atlas_appointment_status_changed", { status_action: action, outcome: "success", screen: "schedule", surface: "clinic" });
  revalidatePath("/dashboard");
  return { ok: true, status };
}

export async function updateAppointmentDetailsInline(
  clinicId: string,
  id: string,
  formData: FormData,
): Promise<InlineAppointmentResult> {
  const rawPatientName = String(formData.get("patient_name") ?? "");
  const patientName = cleanDisplayName(rawPatientName);
  const patientPhone = normalizeIraqiMobile(String(formData.get("patient_phone") ?? ""));
  const doctorId = String(formData.get("doctor_id") ?? "");
  const appointmentAt = parseBaghdadDateTime(String(formData.get("appointment_at") ?? ""));
  const reminderLanguage = String(formData.get("reminder_language") ?? "ku");
  const reminderConsent = formData.get("reminder_consent") === "on";

  if (
    !isUuid(clinicId)
    || !isUuid(id)
    || !isUuid(doctorId)
    || !isValidDisplayName(rawPatientName)
    || !patientPhone
    || !appointmentAt
    || !reminderLanguages.has(reminderLanguage)
  ) return { ok: false, reason: "invalid" };

  const supabase = await createClient();
  const { data: doctor, error: doctorError } = await supabase
    .from("doctors")
    .select("id, name")
    .eq("clinic_id", clinicId)
    .eq("id", doctorId)
    .eq("active", true)
    .maybeSingle();
  if (doctorError || !doctor) return { ok: false, reason: "invalid" };

  // Closed outcomes must be reopened before details can change. The database
  // also enforces this invariant so concurrent requests cannot bypass it.
  const { data, error } = await supabase
    .from("appointments")
    .update({
      patient_name: patientName,
      patient_phone: patientPhone,
      doctor_id: doctor.id,
      doctor_name: doctor.name,
      appointment_at: appointmentAt.toISOString(),
      reminder_language: reminderLanguage,
      reminder_consent: reminderConsent,
    })
    .eq("clinic_id", clinicId)
    .eq("id", id)
    .in("status", ["pending", "confirmed", "cancelled"])
    .is("voided_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    const reason = classifyAppointmentMutationError(error.code, error.message);
    if (reason === "failed") console.error("Atlas inline appointment edit failed", { code: error.code });
    return { ok: false, reason };
  }
  if (!data) return { ok: false, reason: "invalid" };

  revalidatePath("/dashboard");
  return { ok: true, updated: true };
}

export async function archiveAppointmentInline(
  clinicId: string,
  id: string,
): Promise<InlineAppointmentResult> {
  if (!isUuid(clinicId) || !isUuid(id)) return { ok: false, reason: "invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .update({
      status: "voided",
      void_reason: "Removed by clinic staff",
    })
    .eq("clinic_id", clinicId)
    .eq("id", id)
    .is("voided_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    const reason = classifyAppointmentMutationError(error.code, error.message);
    if (reason === "failed") console.error("Atlas inline appointment archive failed", { code: error.code });
    return { ok: false, reason };
  }
  if (!data) return { ok: false, reason: "failed" };

  revalidatePath("/dashboard");
  return { ok: true, archived: true };
}
