"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/appointments";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const staffRoles = new Set(["manager", "receptionist"]);

function staffUrl(clinicId: string, key: "error" | "notice", value: string) {
  const params = new URLSearchParams({ [key]: value });
  if (isUuid(clinicId)) params.set("clinic", clinicId);
  return `/dashboard/staff?${params}`;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function validEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function ownerContext(clinicId: string) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const { data: clinic, error } = await supabase
    .from("clinics")
    .select("id, owner_id")
    .eq("id", clinicId)
    .maybeSingle();

  if (error || !clinic || clinic.owner_id !== userData.user.id) {
    redirect(staffUrl(clinicId, "error", "owner_required"));
  }

  return { supabase, ownerId: userData.user.id };
}

async function findUserIdByEmail(email: string) {
  const admin = createAdminClient();
  const perPage = 1000;
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match.id;
    if (data.users.length < perPage) break;
  }
  return null;
}

export async function addStaffMember(formData: FormData) {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const role = String(formData.get("role") ?? "receptionist");

  if (!isUuid(clinicId) || !validEmail(email) || !staffRoles.has(role)) {
    redirect(staffUrl(clinicId, "error", "invalid"));
  }

  const { supabase, ownerId } = await ownerContext(clinicId);

  let userId: string | null = null;
  try {
    userId = await findUserIdByEmail(email);
  } catch {
    redirect(staffUrl(clinicId, "error", "directory_unavailable"));
  }

  if (!userId) redirect(staffUrl(clinicId, "error", "user_not_found"));
  if (userId === ownerId) redirect(staffUrl(clinicId, "error", "owner_protected"));

  const { error } = await supabase.from("clinic_members").insert({
    clinic_id: clinicId,
    user_id: userId,
    role,
  });

  if (error) {
    if (error.code === "23505") redirect(staffUrl(clinicId, "error", "already_member"));
    console.error("Atlas staff add failed", { code: error.code });
    redirect(staffUrl(clinicId, "error", "save_failed"));
  }

  revalidatePath("/dashboard/staff");
  redirect(staffUrl(clinicId, "notice", "added"));
}

export async function updateStaffRole(clinicId: string, userId: string, formData: FormData) {
  const role = String(formData.get("role") ?? "");
  if (!isUuid(clinicId) || !isUuid(userId) || !staffRoles.has(role)) {
    redirect(staffUrl(clinicId, "error", "invalid"));
  }

  const { supabase, ownerId } = await ownerContext(clinicId);
  if (userId === ownerId) redirect(staffUrl(clinicId, "error", "owner_protected"));

  const { data, error } = await supabase
    .from("clinic_members")
    .update({ role })
    .eq("clinic_id", clinicId)
    .eq("user_id", userId)
    .neq("role", "owner")
    .select("user_id")
    .maybeSingle();

  if (error || !data) {
    console.error("Atlas staff role update failed", { code: error?.code ?? "not_found" });
    redirect(staffUrl(clinicId, "error", "save_failed"));
  }

  revalidatePath("/dashboard/staff");
  redirect(staffUrl(clinicId, "notice", "updated"));
}

export async function removeStaffMember(clinicId: string, userId: string) {
  if (!isUuid(clinicId) || !isUuid(userId)) {
    redirect(staffUrl(clinicId, "error", "invalid"));
  }

  const { supabase, ownerId } = await ownerContext(clinicId);
  if (userId === ownerId) redirect(staffUrl(clinicId, "error", "owner_protected"));

  const { data, error } = await supabase
    .from("clinic_members")
    .delete()
    .eq("clinic_id", clinicId)
    .eq("user_id", userId)
    .neq("role", "owner")
    .select("user_id")
    .maybeSingle();

  if (error || !data) {
    console.error("Atlas staff removal failed", { code: error?.code ?? "not_found" });
    redirect(staffUrl(clinicId, "error", "save_failed"));
  }

  revalidatePath("/dashboard/staff");
  redirect(staffUrl(clinicId, "notice", "removed"));
}
