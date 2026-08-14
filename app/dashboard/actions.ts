"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  canTransitionAppointment,
  cleanDisplayName,
  isAppointmentStatus,
  isUuid,
  isValidDisplayName,
  normalizeIraqiMobile,
  parseBaghdadDateTime,
} from "@/lib/appointments";
import type { DashboardMessageCode } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

function dashboardUrl(
  key: "error" | "notice",
  value: DashboardMessageCode,
  clinicId?: string,
) {
  const params = new URLSearchParams({ [key]: value });
  if (clinicId && isUuid(clinicId)) params.set("clinic", clinicId);
  return `/dashboard?${params}`;
}

async function authenticatedUserId() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const userId = data.user?.id;

  if (error || typeof userId !== "string") redirect("/login");
  return { supabase, userId };
}

async function authorizeClinic(clinicId: string) {
  const { supabase } = await authenticatedUserId();
  const { data, error } = await supabase
    .from("clinics")
    .select("id")
    .eq("id", clinicId)
    .maybeSingle();
  if (error || !data) redirect(dashboardUrl("error", "clinic_unavailable"));
  return supabase;
}

export async function createClinic(formData: FormData) {
  const rawName = String(formData.get("name") ?? "");
  const name = cleanDisplayName(rawName);
  if (!isValidDisplayName(rawName)) redirect(dashboardUrl("error", "clinic_invalid"));

  const { supabase, userId } = await authenticatedUserId();
  const { data: clinic, error } = await supabase
    .from("clinics")
    .insert({ name, owner_id: userId })
    .select("id")
    .single();

  if (error || !clinic) {
    console.error("Atlas clinic creation failed", { code: error?.code ?? "unknown" });
    redirect(dashboardUrl("error", "clinic_create_failed"));
  }

  revalidatePath("/dashboard");
  redirect(dashboardUrl("notice", "clinic_created", clinic.id));
}

export async function createDoctor(formData: FormData) {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const rawName = String(formData.get("doctor_name") ?? "");
  const name = cleanDisplayName(rawName);

  if (!isUuid(clinicId) || !isValidDisplayName(rawName)) {
    return;
  }

  const supabase = await authorizeClinic(clinicId);

  const { error } = await supabase.from("doctors").insert({
    clinic_id: clinicId,
    name,
    active: true,
  });

  if (error) {
    console.error("Atlas doctor creation failed", { code: error.code });
    return;
  }

  revalidatePath("/dashboard");
}

export async function createAppointment(formData: FormData) {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const idempotencyKey = String(formData.get("idempotency_key") ?? "");
  const rawPatientName = String(formData.get("patient_name") ?? "");
  const patientName = cleanDisplayName(rawPatientName);
  const patientPhone = normalizeIraqiMobile(String(formData.get("patient_phone") ?? ""));
  const doctorId = String(formData.get("doctor_id") ?? "");
  const rawDoctorName = String(formData.get("doctor_name") ?? "");
  const doctorName = cleanDisplayName(rawDoctorName);
  const appointmentAt = parseBaghdadDateTime(String(formData.get("appointment_at") ?? ""));
  const reminderConsent = formData.get("reminder_consent") === "on";

  if (
    !isUuid(clinicId)
    || !isUuid(doctorId
    || !isUuid(idempotencyKey)
    || !isValidDisplayName(rawPatientName)
    || !isValidDisplayName(rawDoctorName)
  ) redirect(dashboardUrl("error", "appointment_invalid", clinicId));
  if (!patientPhone) redirect(dashboardUrl("error", "appointment_phone_invalid", clinicId));
  if (!appointmentAt) redirect(dashboardUrl("error", "appointment_time_invalid", clinicId));

  const supabase = await authorizeClinic(clinicId);

  const { error } = await supabase.from("appointments").insert({
    clinic_id: clinicId,
    patient_name: patientName,
    patient_phone: patientPhone,
    doctor_name: doctorName,
    doctor_id: doctorId,
    appointment_at: appointmentAt.toISOString(),
    idempotency_key: idempotencyKey,
    reminder_consent: reminderConsent,
  });

  if (error) {
    if (error.code === "23505") {
      redirect(dashboardUrl("notice", "appointment_duplicate", clinicId));
    }
    console.error("Atlas appointment creation failed", { code: error.code });
    redirect(dashboardUrl("error", "appointment_create_failed", clinicId));
  }

  revalidatePath("/dashboard");
  redirect(dashboardUrl("notice", "appointment_created", clinicId));
}

export async function updateAppointmentStatus(clinicId: string, id: string, status: string) {
  if (!isUuid(clinicId) || !isUuid(id) || !isAppointmentStatus(status)) {
    redirect(dashboardUrl("error", "appointment_status_invalid"));
  }

  const supabase = await authorizeClinic(clinicId);
  const { data: current, error: readError } = await supabase
    .from("appointments")
    .select("id, status")
    .eq("clinic_id", clinicId)
    .eq("id", id)
    .maybeSingle();

  if (
    readError
    || !current
    || !isAppointmentStatus(current.status)
    || !canTransitionAppointment(current.status, status)
  ) redirect(dashboardUrl("error", "appointment_status_invalid", clinicId));

  const { data, error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("clinic_id", clinicId)
    .eq("id", id)
    .eq("status", current.status)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("Atlas appointment status update failed", { code: error?.code ?? "stale_record" });
    redirect(dashboardUrl("error", "appointment_update_failed", clinicId));
  }

  revalidatePath("/dashboard");
  redirect(dashboardUrl("notice", "appointment_updated", clinicId));
}

export async function deleteAppointment(clinicId: string, id: string) {
  if (!isUuid(clinicId) || !isUuid(id)) {
    redirect(dashboardUrl("error", "appointment_delete_failed"));
  }

  const supabase = await authorizeClinic(clinicId);
  const { data, error } = await supabase
    .from("appointments")
    .delete()
    .eq("clinic_id", clinicId)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("Atlas appointment deletion failed", { code: error?.code ?? "not_found" });
    redirect(dashboardUrl("error", "appointment_delete_failed", clinicId));
  }

  revalidatePath("/dashboard");
  redirect(dashboardUrl("notice", "appointment_deleted", clinicId));
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) console.error("Atlas sign-out failed", { code: error.code });
  redirect("/");
}
