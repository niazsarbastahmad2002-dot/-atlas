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

const appointmentIntervals = new Set([5, 10, 15, 20, 30]);
const reminderLanguages = new Set(["ku", "ar", "en"]);

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
  const { supabase, userId } = await authenticatedUserId();
  const { data, error } = await supabase
    .from("clinics")
    .select("id")
    .eq("id", clinicId)
    .maybeSingle();
  if (error || !data) redirect(dashboardUrl("error", "clinic_unavailable"));
  return { supabase, userId };
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

export async function updateClinicInterval(formData: FormData) {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const interval = Number(formData.get("appointment_interval_minutes"));

  if (!isUuid(clinicId) || !appointmentIntervals.has(interval)) {
    redirect(dashboardUrl("error", "clinic_settings_invalid", clinicId));
  }

  const { supabase } = await authorizeClinic(clinicId);
  const { data, error } = await supabase
    .from("clinics")
    .update({ appointment_interval_minutes: interval })
    .eq("id", clinicId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("Atlas clinic settings update failed", { code: error?.code ?? "not_found" });
    redirect(dashboardUrl("error", "clinic_settings_update_failed", clinicId));
  }

  revalidatePath("/dashboard");
  redirect(dashboardUrl("notice", "clinic_settings_updated", clinicId));
}

export async function createDoctor(formData: FormData) {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const rawName = String(formData.get("doctor_name") ?? "");
  const name = cleanDisplayName(rawName);

  if (!isUuid(clinicId) || !isValidDisplayName(rawName)) {
    redirect(dashboardUrl("error", "doctor_invalid", clinicId));
  }

  const { supabase, userId } = await authorizeClinic(clinicId);
  const { data: lastDoctor } = await supabase
    .from("doctors")
    .select("display_order")
    .eq("clinic_id", clinicId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const displayOrder = Math.min((lastDoctor?.display_order ?? -1) + 1, 10000);

  const { error } = await supabase.from("doctors").insert({
    clinic_id: clinicId,
    name,
    active: true,
    created_by: userId,
    display_order: displayOrder,
  });

  if (error) {
    console.error("Atlas doctor creation failed", { code: error.code });
    redirect(dashboardUrl("error", "doctor_create_failed", clinicId));
  }

  revalidatePath("/dashboard");
  redirect(dashboardUrl("notice", "doctor_created", clinicId));
}

export async function updateDoctor(formData: FormData) {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const doctorId = String(formData.get("doctor_id") ?? "");
  const rawName = String(formData.get("doctor_name") ?? "");
  const name = cleanDisplayName(rawName);

  if (!isUuid(clinicId) || !isUuid(doctorId) || !isValidDisplayName(rawName)) {
    redirect(dashboardUrl("error", "doctor_invalid", clinicId));
  }

  const { supabase } = await authorizeClinic(clinicId);
  const { data, error } = await supabase
    .from("doctors")
    .update({ name })
    .eq("clinic_id", clinicId)
    .eq("id", doctorId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("Atlas doctor update failed", { code: error?.code ?? "not_found" });
    redirect(dashboardUrl("error", "doctor_update_failed", clinicId));
  }

  revalidatePath("/dashboard");
  redirect(dashboardUrl("notice", "doctor_updated", clinicId));
}

export async function setDoctorActive(clinicId: string, doctorId: string, active: boolean) {
  if (!isUuid(clinicId) || !isUuid(doctorId)) {
    redirect(dashboardUrl("error", "doctor_invalid", clinicId));
  }

  const { supabase } = await authorizeClinic(clinicId);
  const { data, error } = await supabase
    .from("doctors")
    .update({ active })
    .eq("clinic_id", clinicId)
    .eq("id", doctorId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("Atlas doctor activation update failed", { code: error?.code ?? "not_found" });
    redirect(dashboardUrl("error", "doctor_update_failed", clinicId));
  }

  revalidatePath("/dashboard");
  redirect(dashboardUrl("notice", active ? "doctor_restored" : "doctor_archived", clinicId));
}

export async function moveDoctor(clinicId: string, doctorId: string, direction: string) {
  if (!isUuid(clinicId) || !isUuid(doctorId) || !["up", "down"].includes(direction)) {
    redirect(dashboardUrl("error", "doctor_invalid", clinicId));
  }

  const { supabase } = await authorizeClinic(clinicId);
  const { data: doctors, error: readError } = await supabase
    .from("doctors")
    .select("id, name, display_order")
    .eq("clinic_id", clinicId)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (readError || !doctors) {
    console.error("Atlas doctor order read failed", { code: readError?.code ?? "unknown" });
    redirect(dashboardUrl("error", "doctor_update_failed", clinicId));
  }

  const ordered = [...doctors];
  const index = ordered.findIndex((doctor) => doctor.id === doctorId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapIndex < 0 || swapIndex >= ordered.length) return;
  [ordered[index], ordered[swapIndex]] = [ordered[swapIndex], ordered[index]];

  for (let displayOrder = 0; displayOrder < ordered.length; displayOrder += 1) {
    const doctor = ordered[displayOrder];
    const { error } = await supabase
      .from("doctors")
      .update({ display_order: displayOrder })
      .eq("clinic_id", clinicId)
      .eq("id", doctor.id);
    if (error) {
      console.error("Atlas doctor reorder failed", { code: error.code });
      redirect(dashboardUrl("error", "doctor_update_failed", clinicId));
    }
  }

  revalidatePath("/dashboard");
  redirect(dashboardUrl("notice", "doctor_updated", clinicId));
}

export async function createAppointment(formData: FormData) {
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
    || !reminderLanguages.has(reminderLanguage)
  ) {
    redirect(dashboardUrl("error", "appointment_invalid", clinicId));
  }
  if (!patientPhone) redirect(dashboardUrl("error", "appointment_phone_invalid", clinicId));
  if (!appointmentAt) redirect(dashboardUrl("error", "appointment_time_invalid", clinicId));

  const { supabase } = await authorizeClinic(clinicId);
  const { data: doctor, error: doctorError } = await supabase
    .from("doctors")
    .select("id, name")
    .eq("clinic_id", clinicId)
    .eq("id", doctorId)
    .eq("active", true)
    .maybeSingle();
  if (doctorError || !doctor) {
    redirect(dashboardUrl("error", "appointment_invalid", clinicId));
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

  const { supabase } = await authorizeClinic(clinicId);
  const { data: current, error: readError } = await supabase
    .from("appointments")
    .select("id, status")
    .eq("clinic_id", clinicId)
    .eq("id", id)
    .is("voided_at", null)
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
    .is("voided_at", null)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("Atlas appointment status update failed", { code: error?.code ?? "stale_record" });
    redirect(dashboardUrl("error", "appointment_update_failed", clinicId));
  }

  revalidatePath("/dashboard");
  redirect(dashboardUrl("notice", "appointment_updated", clinicId));
}

export async function archiveAppointment(clinicId: string, id: string) {
  if (!isUuid(clinicId) || !isUuid(id)) {
    redirect(dashboardUrl("error", "appointment_archive_failed"));
  }

  const { supabase, userId } = await authorizeClinic(clinicId);
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
    .is("voided_at", null)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("Atlas appointment archive failed", { code: error?.code ?? "not_found" });
    redirect(dashboardUrl("error", "appointment_archive_failed", clinicId));
  }

  revalidatePath("/dashboard");
  redirect(dashboardUrl("notice", "appointment_archived", clinicId));
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) console.error("Atlas sign-out failed", { code: error.code });
  redirect("/");
}
