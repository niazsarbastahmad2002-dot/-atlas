"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/appointments";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const staffRoles = new Set(["manager", "receptionist"]);

export type StaffProvisionState = {
  status: "idle" | "success" | "error";
  message: string;
  email?: string;
};

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

async function activeDoctorBelongsToClinic(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clinicId: string,
  doctorId: string,
) {
  if (!isUuid(doctorId)) return false;
  const { data, error } = await supabase
    .from("doctors")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("id", doctorId)
    .eq("active", true)
    .maybeSingle();
  return !error && Boolean(data);
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

export async function provisionStaffMember(
  _previousState: StaffProvisionState,
  formData: FormData,
): Promise<StaffProvisionState> {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const role = String(formData.get("role") ?? "receptionist");
  const assignedDoctorId = String(formData.get("assigned_doctor_id") ?? "");

  if (!isUuid(clinicId) || !validEmail(email) || !staffRoles.has(role)) {
    return { status: "error", message: "Check the staff email and try again." };
  }

  const { supabase, ownerId } = await ownerContext(clinicId);
  if (role === "receptionist" && !(await activeDoctorBelongsToClinic(supabase, clinicId, assignedDoctorId))) {
    return { status: "error", message: "Choose the doctor this receptionist will work with." };
  }
  const admin = createAdminClient();

  let userId: string | null = null;
  try {
    userId = await findUserIdByEmail(email);
    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { atlas_provisioned_by_clinic: clinicId },
      });
      if (error || !data.user) throw error ?? new Error("user_create_failed");
      userId = data.user.id;
    }
  } catch (error) {
    console.error("Atlas staff provisioning failed", { error: error instanceof Error ? error.message : "unknown" });
    return { status: "error", message: "Atlas could not prepare this receptionist account. Try again." };
  }

  if (userId === ownerId) {
    return { status: "error", message: "This account already owns the clinic." };
  }

  const { error: memberError } = await supabase.from("clinic_members").upsert({
    clinic_id: clinicId,
    user_id: userId,
    role,
    assigned_doctor_id: role === "receptionist" ? assignedDoctorId : null,
  }, { onConflict: "clinic_id,user_id" });

  if (memberError) {
    console.error("Atlas staff membership save failed", { code: memberError.code });
    return { status: "error", message: "The account was prepared, but clinic access could not be saved." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/settings");

  return {
    status: "success",
    message: "Receptionist access is ready for the assigned doctor. On a new device they can use this work email for one secure Atlas sign-in link.",
    email,
  };
}

export async function addStaffMember(formData: FormData) {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const role = String(formData.get("role") ?? "receptionist");
  const assignedDoctorId = String(formData.get("assigned_doctor_id") ?? "");

  if (!isUuid(clinicId) || !validEmail(email) || !staffRoles.has(role)) {
    redirect(staffUrl(clinicId, "error", "invalid"));
  }

  const { supabase, ownerId } = await ownerContext(clinicId);
  if (role === "receptionist" && !(await activeDoctorBelongsToClinic(supabase, clinicId, assignedDoctorId))) {
    redirect(staffUrl(clinicId, "error", "doctor_required"));
  }

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
    assigned_doctor_id: role === "receptionist" ? assignedDoctorId : null,
  });

  if (error) {
    if (error.code === "23505") redirect(staffUrl(clinicId, "error", "already_member"));
    console.error("Atlas staff add failed", { code: error.code });
    redirect(staffUrl(clinicId, "error", "save_failed"));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/staff");
  redirect(staffUrl(clinicId, "notice", "added"));
}

export async function updateStaffRole(clinicId: string, userId: string, formData: FormData) {
  const role = String(formData.get("role") ?? "");
  const assignedDoctorId = String(formData.get("assigned_doctor_id") ?? "");
  if (!isUuid(clinicId) || !isUuid(userId) || !staffRoles.has(role)) {
    redirect(staffUrl(clinicId, "error", "invalid"));
  }

  const { supabase, ownerId } = await ownerContext(clinicId);
  if (userId === ownerId) redirect(staffUrl(clinicId, "error", "owner_protected"));
  if (role === "receptionist" && !(await activeDoctorBelongsToClinic(supabase, clinicId, assignedDoctorId))) {
    redirect(staffUrl(clinicId, "error", "doctor_required"));
  }

  const { data, error } = await supabase
    .from("clinic_members")
    .update({
      role,
      assigned_doctor_id: role === "receptionist" ? assignedDoctorId : null,
    })
    .eq("clinic_id", clinicId)
    .eq("user_id", userId)
    .neq("role", "owner")
    .select("user_id")
    .maybeSingle();

  if (error || !data) {
    console.error("Atlas staff access update failed", { code: error?.code ?? "not_found" });
    redirect(staffUrl(clinicId, "error", "save_failed"));
  }

  revalidatePath("/dashboard");
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

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/staff");
  redirect(staffUrl(clinicId, "notice", "removed"));
}

export async function transferClinicAdministrator(clinicId: string, formData: FormData) {
  const newAdministratorId = String(formData.get("new_administrator_id") ?? "");
  const confirmed = String(formData.get("confirm_transfer") ?? "") === "yes";
  if (!isUuid(clinicId) || !isUuid(newAdministratorId) || !confirmed) {
    redirect(staffUrl(clinicId, "error", "transfer_invalid"));
  }

  const { ownerId } = await ownerContext(clinicId);
  if (newAdministratorId === ownerId) {
    redirect(staffUrl(clinicId, "error", "transfer_invalid"));
  }

  const admin = createAdminClient();
  const transferRpc = admin.rpc as unknown as (
    functionName: string,
    args: { p_clinic_id: string; p_new_administrator_id: string; p_actor_id: string },
  ) => Promise<{ data: boolean | null; error: { code?: string; message?: string } | null }>;

  const { data, error } = await transferRpc("transfer_clinic_administrator", {
    p_clinic_id: clinicId,
    p_new_administrator_id: newAdministratorId,
    p_actor_id: ownerId,
  });

  if (error || data !== true) {
    console.error("Atlas clinic administrator transfer failed", { code: error?.code ?? "transfer_failed" });
    redirect(staffUrl(clinicId, "error", "transfer_failed"));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/staff");
  redirect(staffUrl(clinicId, "notice", "administrator_transferred"));
}
