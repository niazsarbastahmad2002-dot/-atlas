"use server";

import { revalidatePath } from "next/cache";
import {
  appointmentCreatePayloadMatches,
  canTransitionAppointment,
  classifyAppointmentCreateError,
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
const contactRelationships = new Set<AppointmentContactRelationship>(["patient", "parent_guardian", "relative_caregiver"]);

export type AppointmentContactRelationship = "patient" | "parent_guardian" | "relative_caregiver";

export type InlineAppointmentResult =
  | { ok: true; status?: AppointmentStatus; archived?: boolean; updated?: boolean; created?: boolean; duplicate?: boolean }
  | { ok: false; reason: AppointmentMutationFailure };

function statusAction(status: AppointmentStatus) {
  if (status === "confirmed") return "confirm" as const;
  if (status === "cancelled") return "cancel" as const;
  if (status === "completed") return "complete" as const;
  if (status === "no_show") return "no_show" as const;
  if (status === "pending") return "pending" as const;
  return null;
}

function contactRelationship(value: FormDataEntryValue | null): AppointmentContactRelationship | null {
  if (value === null) return null;
  const relationship = String(value) as AppointmentContactRelationship;
  return contactRelationships.has(relationship) ? relationship : null;
}

function requiredContactRelationship(value: FormDataEntryValue | null): AppointmentContactRelationship | null {
  if (value === null) return null;
  return contactRelationship(value);
}

async function appointmentClinicContext(clinicId: string) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const [{ data: clinic, error: clinicError }, { data: membership, error: membershipError }] = await Promise.all([
    supabase.from("clinics").select("id, owner_id").eq("id", clinicId).maybeSingle(),
    supabase
      .from("clinic_members")
      .select("role")
      .eq("clinic_id", clinicId)
      .eq("user_id", userData.user.id)
      .maybeSingle(),
  ]);

  if (clinicError || membershipError || !clinic) return null;
  const hasClinicAccess = clinic.owner_id === userData.user.id
    || membership?.role === "owner"
    || membership?.role === "manager"
    || membership?.role === "receptionist";
  if (!hasClinicAccess) return null;

  return { supabase, userId: userData.user.id };
}

export async function createAppointmentInline(formData: FormData): Promise<InlineAppointmentResult> {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const idempotencyKey = String(formData.get("idempotency_key") ?? "");
  const rawPatientName = String(formData.get("patient_name") ?? "");
  const patientName = cleanDisplayName(rawPatientName);
  const patientPhone = normalizeIraqiMobile(String(formData.get("patient_phone") ?? ""));
  const relationship = contactRelationship(formData.get("contact_relationship"));
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
    || !relationship
    || !appointmentAt
    || !reminderLanguages.has(reminderLanguage)
  ) {
    queueAtlasServerEvent("atlas_appointment_created", { outcome: "validation", interaction: "form", screen: "schedule", surface: "clinic" });
    return { ok: false, reason: "invalid" };
  }

  const context = await appointmentClinicContext(clinicId);
  if (!context) return { ok: false, reason: "invalid" };
  const { supabase } = context;
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
    contact_relationship: relationship,
    doctor_name: doctor.name,
    doctor_id: doctor.id,
    appointment_at: appointmentAt.toISOString(),
    idempotency_key: idempotencyKey,
    reminder_consent: reminderConsent,
    reminder_language: reminderLanguage,
  });

  if (error) {
    const createFailure = classifyAppointmentCreateError(
      error.code,
      `${error.message ?? ""} ${error.details ?? ""}`,
    );
    if (createFailure === "duplicate") {
      const { data: existing, error: existingError } = await supabase
        .from("appointments")
        .select("patient_name, patient_phone, contact_relationship, doctor_id, appointment_at, reminder_consent, reminder_language, voided_at")
        .eq("clinic_id", clinicId)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      const matches = !existingError && existing && appointmentCreatePayloadMatches(existing, {
        patientName,
        patientPhone,
        contactRelationship: relationship,
        doctorId: doctor.id,
        appointmentAt: appointmentAt.toISOString(),
        reminderConsent,
        reminderLanguage,
      });

      if (matches) {
        queueAtlasServerEvent("atlas_appointment_created", {
          outcome: "duplicate",
          interaction: "form",
          screen: "schedule",
          surface: "clinic",
        });
        return { ok: true, created: false, duplicate: true };
      }

      console.error("Atlas fast appointment idempotency payload mismatch", {
        code: existingError?.code ?? "payload_mismatch",
      });
      queueAtlasServerEvent("atlas_appointment_created", {
        outcome: "failure",
        interaction: "form",
        screen: "schedule",
        surface: "clinic",
      });
      return { ok: false, reason: "failed" };
    }
    if (createFailure === "slot_taken") {
      queueAtlasServerEvent("atlas_appointment_created", {
        outcome: "slot_taken",
        interaction: "form",
        screen: "schedule",
        surface: "clinic",
      });
      return { ok: false, reason: "slot_taken" };
    }

    const reason = classifyAppointmentMutationError(error.code, error.message);
    if (reason === "failed") console.error("Atlas fast appointment creation failed", { code: error.code });
    queueAtlasServerEvent("atlas_appointment_created", {
      outcome: "failure",
      interaction: "form",
      screen: "schedule",
      surface: "clinic",
    });
    return { ok: false, reason };
  }

  queueAtlasServerEvent("atlas_appointment_created", { outcome: "success", interaction: "form", screen: "schedule", surface: "clinic" });
  return { ok: true, created: true };
}

export async function updateAppointmentStatusInline(
  clinicId: string,
  id: string,
  expectedStatus: string,
  expectedRevision: number,
  status: string,
): Promise<InlineAppointmentResult> {
  if (
    !isUuid(clinicId)
    || !isUuid(id)
    || !isAppointmentStatus(expectedStatus)
    || !Number.isInteger(expectedRevision)
    || expectedRevision < 1
    || !isAppointmentStatus(status)
    || !canTransitionAppointment(expectedStatus, status)
  ) {
    return { ok: false, reason: "invalid" };
  }

  const action = statusAction(status);
  const context = await appointmentClinicContext(clinicId);
  if (!context) return { ok: false, reason: "invalid" };
  const { supabase } = context;
  const { data, error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("clinic_id", clinicId)
    .eq("id", id)
    .eq("status", expectedStatus)
    .eq("appointment_revision", expectedRevision)
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
    const { data: current } = await supabase
      .from("appointments")
      .select("status, appointment_revision")
      .eq("clinic_id", clinicId)
      .eq("id", id)
      .is("voided_at", null)
      .maybeSingle();

    if (current && current.appointment_revision === expectedRevision + 1 && isAppointmentStatus(current.status) && current.status === status) {
      if (action) queueAtlasServerEvent("atlas_appointment_status_changed", { status_action: action, outcome: "duplicate", screen: "schedule", surface: "clinic" });
      revalidatePath("/dashboard");
      return { ok: true, status };
    }

    if (action) queueAtlasServerEvent("atlas_appointment_status_changed", { status_action: action, outcome: "stale", screen: "schedule", surface: "clinic" });
    return { ok: false, reason: "stale" };
  }

  if (action) queueAtlasServerEvent("atlas_appointment_status_changed", { status_action: action, outcome: "success", screen: "schedule", surface: "clinic" });
  revalidatePath("/dashboard");
  return { ok: true, status };
}

export async function updateAppointmentDetailsInline(
  clinicId: string,
  id: string,
  expectedStatus: string,
  expectedRevision: number,
  formData: FormData,
): Promise<InlineAppointmentResult> {
  const rawPatientName = String(formData.get("patient_name") ?? "");
  const patientName = cleanDisplayName(rawPatientName);
  const patientPhone = normalizeIraqiMobile(String(formData.get("patient_phone") ?? ""));
  const relationship = requiredContactRelationship(formData.get("contact_relationship"));
  const doctorId = String(formData.get("doctor_id") ?? "");
  const appointmentAt = parseBaghdadDateTime(String(formData.get("appointment_at") ?? ""));
  const reminderLanguage = String(formData.get("reminder_language") ?? "ku");
  const reminderConsent = formData.get("reminder_consent") === "on";

  if (
    !isUuid(clinicId)
    || !isUuid(id)
    || !isAppointmentStatus(expectedStatus)
    || !Number.isInteger(expectedRevision)
    || expectedRevision < 1
    || !["pending", "confirmed", "cancelled"].includes(expectedStatus)
    || !isUuid(doctorId)
    || !isValidDisplayName(rawPatientName)
    || !patientPhone
    || !relationship
    || !appointmentAt
    || !reminderLanguages.has(reminderLanguage)
  ) return { ok: false, reason: "invalid" };

  const context = await appointmentClinicContext(clinicId);
  if (!context) return { ok: false, reason: "invalid" };
  const { supabase } = context;
  const { data: doctor, error: doctorError } = await supabase
    .from("doctors")
    .select("id, name")
    .eq("clinic_id", clinicId)
    .eq("id", doctorId)
    .eq("active", true)
    .maybeSingle();
  if (doctorError || !doctor) return { ok: false, reason: "invalid" };

  const { data, error } = await supabase
    .from("appointments")
    .update({
      patient_name: patientName,
      patient_phone: patientPhone,
      contact_relationship: relationship,
      doctor_id: doctor.id,
      doctor_name: doctor.name,
      appointment_at: appointmentAt.toISOString(),
      reminder_language: reminderLanguage,
      reminder_consent: reminderConsent,
    })
    .eq("clinic_id", clinicId)
    .eq("id", id)
    .eq("status", expectedStatus)
    .eq("appointment_revision", expectedRevision)
    .is("voided_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    const reason = classifyAppointmentMutationError(error.code, error.message);
    if (reason === "failed") console.error("Atlas inline appointment edit failed", { code: error.code });
    return { ok: false, reason };
  }
  if (!data) {
    const { data: current } = await supabase
      .from("appointments")
      .select("status, appointment_revision, patient_name, patient_phone, contact_relationship, doctor_id, doctor_name, appointment_at, reminder_language, reminder_consent, voided_at")
      .eq("clinic_id", clinicId)
      .eq("id", id)
      .maybeSingle();

    if (current?.voided_at) {
      return { ok: false, reason: "stale" };
    }
    const currentTime = current ? Date.parse(current.appointment_at) : Number.NaN;
    if (
      current
      && current.appointment_revision === expectedRevision + 1
      && current.status === expectedStatus
      && current.patient_name === patientName
      && current.patient_phone === patientPhone
      && current.contact_relationship === relationship
      && current.doctor_id === doctor.id
      && current.doctor_name === doctor.name
      && Number.isFinite(currentTime)
      && currentTime === appointmentAt.getTime()
      && current.reminder_language === reminderLanguage
      && current.reminder_consent === reminderConsent
    ) {
      revalidatePath("/dashboard");
      return { ok: true, updated: true };
    }
    if (current && isAppointmentStatus(current.status) && current.status !== expectedStatus) {
      return { ok: false, reason: "stale" };
    }
    return { ok: false, reason: "stale" };
  }

  revalidatePath("/dashboard");
  return { ok: true, updated: true };
}

export async function archiveAppointmentInline(
  clinicId: string,
  id: string,
  expectedStatus: string,
  expectedRevision: number,
): Promise<InlineAppointmentResult> {
  if (!isUuid(clinicId) || !isUuid(id) || !isAppointmentStatus(expectedStatus) || !Number.isInteger(expectedRevision) || expectedRevision < 1) {
    return { ok: false, reason: "invalid" };
  }

  const context = await appointmentClinicContext(clinicId);
  if (!context) return { ok: false, reason: "invalid" };
  const { supabase, userId } = context;

  const { data, error } = await supabase
    .from("appointments")
    .update({
      status: "voided",
      voided_at: new Date().toISOString(),
      voided_by: userId,
      void_reason: "Removed by clinic staff",
    })
    .eq("clinic_id", clinicId)
    .eq("id", id)
    .eq("status", expectedStatus)
    .eq("appointment_revision", expectedRevision)
    .is("voided_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    const reason = classifyAppointmentMutationError(error.code, error.message);
    if (reason === "failed") console.error("Atlas inline appointment archive failed", { code: error.code });
    return { ok: false, reason };
  }
  if (!data) {
    const { data: current } = await supabase
      .from("appointments")
      .select("status, voided_at")
      .eq("clinic_id", clinicId)
      .eq("id", id)
      .maybeSingle();

    if (current?.voided_at) {
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/history");
      return { ok: true, archived: true };
    }
    if (current && isAppointmentStatus(current.status) && current.status !== expectedStatus) {
      return { ok: false, reason: "stale" };
    }
    return { ok: false, reason: "stale" };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  return { ok: true, archived: true };
}
