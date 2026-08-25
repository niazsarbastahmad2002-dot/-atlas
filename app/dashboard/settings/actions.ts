"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cleanDisplayName, isUuid, isValidDisplayName } from "@/lib/appointments";
import { createClient } from "@/lib/supabase/server";

const appointmentIntervals = new Set([5, 10, 15, 20, 30]);
const reminderLanguages = new Set(["ku", "bd", "ar", "en"]);

function settingsUrl(clinicId: string, key: "error" | "notice", value: string) {
  const params = new URLSearchParams({ [key]: value });
  if (isUuid(clinicId)) params.set("clinic", clinicId);
  return `/dashboard/settings?${params}`;
}

async function authenticatedContext() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, user: data.user };
}

async function managementContext(clinicId: string) {
  const { supabase, user } = await authenticatedContext();
  const [{ data: clinic }, { data: membership }] = await Promise.all([
    supabase.from("clinics").select("id, owner_id").eq("id", clinicId).maybeSingle(),
    supabase
      .from("clinic_members")
      .select("role")
      .eq("clinic_id", clinicId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const canManage = clinic
    && (clinic.owner_id === user.id || membership?.role === "owner" || membership?.role === "manager");
  if (!canManage) redirect(settingsUrl(clinicId, "error", "manager_required"));
  return { supabase, user, clinic };
}

function refreshSettings() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

export async function updateClinicName(formData: FormData) {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const rawName = String(formData.get("clinic_name") ?? "");
  const name = cleanDisplayName(rawName);
  if (!isUuid(clinicId) || !isValidDisplayName(rawName)) {
    redirect(settingsUrl(clinicId, "error", "clinic_invalid"));
  }

  const { supabase } = await managementContext(clinicId);
  const { data, error } = await supabase
    .from("clinics")
    .update({ name })
    .eq("id", clinicId)
    .select("id")
    .maybeSingle();
  if (error || !data) redirect(settingsUrl(clinicId, "error", "save_failed"));

  refreshSettings();
}

export async function updateClinicInterval(formData: FormData) {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const interval = Number(formData.get("appointment_interval_minutes"));
  if (!isUuid(clinicId) || !appointmentIntervals.has(interval)) {
    redirect(settingsUrl(clinicId, "error", "interval_invalid"));
  }

  const { supabase } = await managementContext(clinicId);
  const { data, error } = await supabase
    .from("clinics")
    .update({ appointment_interval_minutes: interval })
    .eq("id", clinicId)
    .select("id")
    .maybeSingle();
  if (error || !data) redirect(settingsUrl(clinicId, "error", "save_failed"));

  refreshSettings();
}

export async function createDoctor(formData: FormData) {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const rawName = String(formData.get("doctor_name") ?? "");
  const name = cleanDisplayName(rawName);
  if (!isUuid(clinicId) || !isValidDisplayName(rawName)) {
    redirect(settingsUrl(clinicId, "error", "doctor_invalid"));
  }

  const { supabase, user } = await managementContext(clinicId);
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
    created_by: user.id,
    display_order: displayOrder,
  });
  if (error) redirect(settingsUrl(clinicId, "error", "save_failed"));

  refreshSettings();
}

export async function updateDoctor(formData: FormData) {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const doctorId = String(formData.get("doctor_id") ?? "");
  const rawName = String(formData.get("doctor_name") ?? "");
  const name = cleanDisplayName(rawName);
  if (!isUuid(clinicId) || !isUuid(doctorId) || !isValidDisplayName(rawName)) {
    redirect(settingsUrl(clinicId, "error", "doctor_invalid"));
  }

  const { supabase } = await managementContext(clinicId);
  const { data, error } = await supabase
    .from("doctors")
    .update({ name })
    .eq("clinic_id", clinicId)
    .eq("id", doctorId)
    .select("id")
    .maybeSingle();
  if (error || !data) redirect(settingsUrl(clinicId, "error", "save_failed"));

  refreshSettings();
}

export async function setDoctorActive(clinicId: string, doctorId: string, active: boolean) {
  if (!isUuid(clinicId) || !isUuid(doctorId)) {
    redirect(settingsUrl(clinicId, "error", "doctor_invalid"));
  }

  const { supabase } = await managementContext(clinicId);
  const { data, error } = await supabase
    .from("doctors")
    .update({ active })
    .eq("clinic_id", clinicId)
    .eq("id", doctorId)
    .select("id")
    .maybeSingle();
  if (error || !data) redirect(settingsUrl(clinicId, "error", "save_failed"));

  refreshSettings();
}

export async function moveDoctor(clinicId: string, doctorId: string, direction: string) {
  if (!isUuid(clinicId) || !isUuid(doctorId) || !["up", "down"].includes(direction)) {
    redirect(settingsUrl(clinicId, "error", "doctor_invalid"));
  }

  const { supabase } = await managementContext(clinicId);
  const { data: doctors, error } = await supabase
    .from("doctors")
    .select("id, name, display_order")
    .eq("clinic_id", clinicId)
    .eq("active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });
  if (error || !doctors) redirect(settingsUrl(clinicId, "error", "save_failed"));

  const index = doctors.findIndex((doctor) => doctor.id === doctorId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= doctors.length) return;

  const current = doctors[index];
  const adjacent = doctors[target];
  const [currentResult, adjacentResult] = await Promise.all([
    supabase
      .from("doctors")
      .update({ display_order: adjacent.display_order })
      .eq("clinic_id", clinicId)
      .eq("id", current.id),
    supabase
      .from("doctors")
      .update({ display_order: current.display_order })
      .eq("clinic_id", clinicId)
      .eq("id", adjacent.id),
  ]);

  if (currentResult.error || adjacentResult.error) {
    redirect(settingsUrl(clinicId, "error", "save_failed"));
  }

  refreshSettings();
}

export async function updateReminderSettings(formData: FormData) {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const enabled = formData.get("enabled") === "on";
  const leadMinutes = Number(formData.get("lead_minutes"));
  const defaultLanguage = String(formData.get("default_reminder_language") ?? "ku");

  if (
    !isUuid(clinicId)
    || !Number.isInteger(leadMinutes)
    || leadMinutes < 30
    || leadMinutes > 10080
    || !reminderLanguages.has(defaultLanguage)
  ) redirect(settingsUrl(clinicId, "error", "reminders_invalid"));

  const { supabase } = await managementContext(clinicId);
  const { data: current, error: readError } = await supabase
    .from("clinic_reminder_settings")
    .select("messaging_approved_at")
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (readError || !current) redirect(settingsUrl(clinicId, "error", "save_failed"));
  if (enabled && !current.messaging_approved_at) {
    redirect(settingsUrl(clinicId, "error", "approval_required"));
  }

  const { data, error } = await supabase
    .from("clinic_reminder_settings")
    .update({
      enabled,
      lead_minutes: leadMinutes,
      default_reminder_language: defaultLanguage,
    })
    .eq("clinic_id", clinicId)
    .select("clinic_id")
    .maybeSingle();
  if (error || !data) redirect(settingsUrl(clinicId, "error", "save_failed"));

  refreshSettings();
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
