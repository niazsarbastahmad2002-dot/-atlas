"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/appointments";
import { createClient } from "@/lib/supabase/server";

const reminderLanguages = new Set(["ku", "ar", "en"]);

function remindersUrl(clinicId: string, key: "error" | "notice", value: string) {
  const params = new URLSearchParams({ [key]: value });
  if (isUuid(clinicId)) params.set("clinic", clinicId);
  return `/dashboard/reminders?${params}`;
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
  ) {
    redirect(remindersUrl(clinicId, "error", "invalid"));
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const { data: current, error: readError } = await supabase
    .from("clinic_reminder_settings")
    .select("messaging_approved_at")
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (readError || !current) redirect(remindersUrl(clinicId, "error", "unavailable"));
  if (enabled && !current.messaging_approved_at) {
    redirect(remindersUrl(clinicId, "error", "approval_required"));
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

  if (error || !data) {
    console.error("Atlas reminder settings update failed", { code: error?.code ?? "not_found" });
    redirect(remindersUrl(clinicId, "error", "save_failed"));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reminders");
  redirect(remindersUrl(clinicId, "notice", "saved"));
}
