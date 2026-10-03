"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/appointments";
import { createClient } from "@/lib/supabase/server";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const countryPattern = /^[A-Z]{2}$/;
const publicPhonePattern = /^[+]?[0-9() .-]{6,39}$/;

function profileUrl(clinicId: string, key?: "error" | "notice", value?: string) {
  const params = new URLSearchParams();
  if (isUuid(clinicId)) params.set("clinic", clinicId);
  if (key && value) params.set(key, value);
  const query = params.toString();
  return `/dashboard/settings/public-profile${query ? `?${query}` : ""}`;
}

function textField(formData: FormData, key: string, max: number) {
  const value = String(formData.get(key) ?? "").trim().replace(/\s+/g, " ");
  return value.length <= max ? value : "";
}

function longTextField(formData: FormData, key: string, max: number) {
  const value = String(formData.get(key) ?? "").trim().replace(/\r\n?/g, "\n");
  return value.length <= max ? value : "";
}

function slugField(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim().toLowerCase();
  return value.length >= 3 && value.length <= 80 && slugPattern.test(value) ? value : "";
}

async function managementContext(clinicId: string) {
  if (!isUuid(clinicId)) redirect(profileUrl(clinicId, "error", "invalid"));

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

function saved(clinicId: string) {
  revalidatePath("/care");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/public-profile");
  redirect(profileUrl(clinicId, "notice", "saved"));
}

function failed(clinicId: string, code = "save_failed") {
  redirect(profileUrl(clinicId, "error", code));
}

export async function saveClinicDirectoryProfile(formData: FormData) {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const slug = slugField(formData, "slug");
  const displayName = textField(formData, "display_name", 120);
  const description = longTextField(formData, "description", 1200);
  const countryCode = String(formData.get("country_code") ?? "IQ").trim().toUpperCase();
  const city = textField(formData, "city", 100);
  const area = textField(formData, "area", 140);
  const addressText = textField(formData, "address_text", 280);
  const publicPhone = textField(formData, "public_phone", 40);
  const isPublished = formData.get("is_published") === "on";

  if (
    !isUuid(clinicId)
    || !slug
    || displayName.length < 2
    || !countryPattern.test(countryCode)
    || (publicPhone && !publicPhonePattern.test(publicPhone))
    || (isPublished && !city)
  ) failed(clinicId, "invalid");

  const { supabase } = await managementContext(clinicId);
  const { data: existing, error: existingError } = await supabase
    .from("clinic_directory_profiles")
    .select("latitude, longitude")
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (existingError) failed(clinicId);

  const { error } = await supabase
    .from("clinic_directory_profiles")
    .upsert({
      clinic_id: clinicId,
      slug,
      display_name: displayName,
      description: description || null,
      country_code: countryCode,
      city: city || null,
      area: area || null,
      address_text: addressText || null,
      latitude: existing?.latitude ?? null,
      longitude: existing?.longitude ?? null,
      public_phone: publicPhone || null,
      is_published: isPublished,
    }, { onConflict: "clinic_id" });

  if (error?.code === "23505") failed(clinicId, "slug_taken");
  if (error) failed(clinicId);
  saved(clinicId);
}

export async function saveDoctorDirectoryProfile(formData: FormData) {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const doctorId = String(formData.get("doctor_id") ?? "");
  const slug = slugField(formData, "slug");
  const displayName = textField(formData, "display_name", 120);
  const specialty = textField(formData, "specialty", 120);
  const subspecialty = textField(formData, "subspecialty", 160);
  const bio = longTextField(formData, "bio", 1600);
  const isPublished = formData.get("is_published") === "on";

  if (
    !isUuid(clinicId)
    || !isUuid(doctorId)
    || !slug
    || displayName.length < 2
    || specialty.length < 2
  ) failed(clinicId, "invalid");

  const { supabase } = await managementContext(clinicId);
  const { data: doctor, error: doctorError } = await supabase
    .from("doctors")
    .select("id, active")
    .eq("clinic_id", clinicId)
    .eq("id", doctorId)
    .maybeSingle();
  if (doctorError || !doctor) {
    failed(clinicId);
    return;
  }
  if (isPublished && !doctor.active) failed(clinicId, "doctor_archived");

  const { error } = await supabase
    .from("doctor_directory_profiles")
    .upsert({
      clinic_id: clinicId,
      doctor_id: doctorId,
      slug,
      display_name: displayName,
      specialty,
      subspecialty: subspecialty || null,
      bio: bio || null,
      is_published: isPublished,
    }, { onConflict: "clinic_id,doctor_id" });

  if (error?.code === "23505") failed(clinicId, "slug_taken");
  if (error) failed(clinicId);
  saved(clinicId);
}
