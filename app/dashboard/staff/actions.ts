"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/appointments";
import {
  readPendingStaffInvitations,
  withoutPendingStaffInvitation,
} from "@/lib/staff-invitations";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const staffRoles = new Set(["manager", "receptionist"]);

function staffUrl(clinicId: string, key: "error" | "notice", value: string) {
  const params = new URLSearchParams({ [key]: value });
  if (isUuid(clinicId)) params.set("clinic", clinicId);
  return `/dashboard/staff?${params}`;
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

// Legacy email-era invitations can still be cancelled while the migration window
// is open. New invitations are created only as explicit one-use join links in
// invite-actions.ts; this file no longer creates auth users or sends email invites.
export async function cancelPendingInvitation(clinicId: string, userId: string) {
  if (!isUuid(clinicId) || !isUuid(userId)) {
    redirect(staffUrl(clinicId, "error", "invalid"));
  }

  await ownerContext(clinicId);
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) redirect(staffUrl(clinicId, "error", "directory_unavailable"));

  const pending = readPendingStaffInvitations(data.user.app_metadata);
  if (!pending.some((item) => item.clinic_id === clinicId)) {
    redirect(staffUrl(clinicId, "notice", "invitation_removed"));
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: withoutPendingStaffInvitation(data.user.app_metadata, clinicId),
  });
  if (updateError) redirect(staffUrl(clinicId, "error", "save_failed"));

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/settings");
  redirect(staffUrl(clinicId, "notice", "invitation_removed"));
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
