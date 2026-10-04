"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/appointments";
import { baghdadDate } from "@/lib/i18n/config";
import { createClient } from "@/lib/supabase/server";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function settingsUrl(clinicId: string, key?: "error" | "notice", value?: string) {
  const params = new URLSearchParams();
  if (isUuid(clinicId)) params.set("clinic", clinicId);
  if (key && value) params.set(key, value);
  const query = params.toString();
  return `/dashboard/settings/public-profile/availability${query ? `?${query}` : ""}`;
}

async function managementContext(clinicId: string) {
  if (!isUuid(clinicId)) redirect("/dashboard/settings");

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const [{ data: clinic }, { data: membership }] = await Promise.all([
    supabase.from("clinics").select("id, owner_id").eq("id", clinicId).maybeSingle(),
    supabase.from("clinic_members").select("role").eq("clinic_id", clinicId).eq("user_id", userData.user.id).maybeSingle(),
  ]);

  const canManage = clinic
    && (clinic.owner_id === userData.user.id || membership?.role === "owner" || membership?.role === "manager");
  if (!canManage) redirect("/dashboard/settings");
  return { supabase };
}

function fail(clinicId: string, code = "save_failed") {
  redirect(settingsUrl(clinicId, "error", code));
}

function saved(clinicId: string) {
  revalidatePath("/care");
  revalidatePath("/dashboard/settings/public-profile");
  revalidatePath("/dashboard/settings/public-profile/availability");
  redirect(settingsUrl(clinicId, "notice", "saved"));
}

export async function savePublicBookingSettings(formData: FormData) {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const enabled = formData.get("enabled") === "on";
  const minLeadMinutes = Number(formData.get("min_lead_minutes"));
  const bookingHorizonDays = Number(formData.get("booking_horizon_days"));

  if (
    !isUuid(clinicId)
    || !Number.isInteger(minLeadMinutes)
    || minLeadMinutes < 0
    || minLeadMinutes > 10080
    || !Number.isInteger(bookingHorizonDays)
    || bookingHorizonDays < 1
    || bookingHorizonDays > 90
  ) fail(clinicId, "invalid");

  const { supabase } = await managementContext(clinicId);
  const { data: existing, error: readError } = await supabase
    .from("clinic_public_booking_settings")
    .select("clinic_id")
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (readError) fail(clinicId);

  const settingsPatch = {
    enabled,
    min_lead_minutes: minLeadMinutes,
    booking_horizon_days: bookingHorizonDays,
  };
  const { error } = existing
    ? await supabase
        .from("clinic_public_booking_settings")
        .update(settingsPatch)
        .eq("clinic_id", clinicId)
    : await supabase
        .from("clinic_public_booking_settings")
        .insert({ clinic_id: clinicId, ...settingsPatch });

  if (error) fail(clinicId);
  saved(clinicId);
}

export async function saveDoctorPublicBookingHours(formData: FormData) {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const doctorId = String(formData.get("doctor_id") ?? "");
  if (!isUuid(clinicId) || !isUuid(doctorId)) fail(clinicId, "invalid");

  const { supabase } = await managementContext(clinicId);
  const { data: doctor, error: doctorError } = await supabase
    .from("doctors")
    .select("id, active")
    .eq("clinic_id", clinicId)
    .eq("id", doctorId)
    .maybeSingle();
  if (doctorError || !doctor?.active) fail(clinicId, "doctor_unavailable");

  const rows = [];
  for (let weekday = 0; weekday <= 6; weekday += 1) {
    const startsAt = String(formData.get(`day_${weekday}_start`) ?? "");
    const endsAt = String(formData.get(`day_${weekday}_end`) ?? "");
    const isEnabled = formData.get(`day_${weekday}_enabled`) === "on";

    if (!timePattern.test(startsAt) || !timePattern.test(endsAt) || startsAt >= endsAt) {
      fail(clinicId, "invalid");
    }

    rows.push({
      weekday,
      starts_at: startsAt,
      ends_at: endsAt,
      is_enabled: isEnabled,
    });
  }

  const { data: weekSaved, error: weekError } = await supabase.rpc(
    "save_doctor_public_booking_hours",
    {
      p_clinic_id: clinicId,
      p_doctor_id: doctorId,
      p_hours: rows,
    },
  );
  if (weekError || weekSaved !== true) fail(clinicId);
  saved(clinicId);
}

export async function setDoctorPublicClosedDate(
  clinicId: string,
  doctorId: string,
  isClosed: boolean,
  formData: FormData,
) {
  const bookingDate = String(formData.get("booking_date") ?? "");
  if (
    !isUuid(clinicId)
    || !isUuid(doctorId)
    || typeof isClosed !== "boolean"
    || !datePattern.test(bookingDate)
    || (isClosed && bookingDate < baghdadDate.format(new Date()))
  ) fail(clinicId, "invalid");

  const { supabase } = await managementContext(clinicId);
  const { data: doctor, error: doctorError } = await supabase
    .from("doctors")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("id", doctorId)
    .maybeSingle();
  if (doctorError || !doctor) fail(clinicId, "doctor_unavailable");

  const { data: existingDate, error: dateReadError } = await supabase
    .from("doctor_public_booking_closed_dates")
    .select("booking_date")
    .eq("clinic_id", clinicId)
    .eq("doctor_id", doctorId)
    .eq("booking_date", bookingDate)
    .maybeSingle();
  if (dateReadError) fail(clinicId);

  const { error } = existingDate
    ? await supabase
        .from("doctor_public_booking_closed_dates")
        .update({ is_closed: isClosed })
        .eq("clinic_id", clinicId)
        .eq("doctor_id", doctorId)
        .eq("booking_date", bookingDate)
    : await supabase
        .from("doctor_public_booking_closed_dates")
        .insert({
          clinic_id: clinicId,
          doctor_id: doctorId,
          booking_date: bookingDate,
          is_closed: isClosed,
        });
  if (error) fail(clinicId);
  saved(clinicId);
}
