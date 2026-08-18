"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createAuthClient, type User } from "@supabase/supabase-js";
import { isUuid } from "@/lib/appointments";
import {
  readPendingStaffInvitations,
  withPendingStaffInvitation,
  withoutPendingStaffInvitation,
  type PendingStaffInvitation,
} from "@/lib/staff-invitations";
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

function atlasSiteUrl() {
  const configured = process.env.SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) return `https://${productionHost.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

function createInvitationAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) throw new Error("Atlas public authentication credentials are not configured.");
  return createAuthClient(url, publishableKey, {
    auth: {
      flowType: "implicit",
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
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

async function findUserByEmail(email: string): Promise<User | null> {
  const admin = createAdminClient();
  const perPage = 1000;
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < perPage) break;
  }
  return null;
}

type InvitationResult = {
  status: "success" | "error";
  message: string;
  email: string;
};

async function prepareReceptionistInvitation(
  clinicId: string,
  email: string,
  assignedDoctorId: string,
): Promise<InvitationResult> {
  const { supabase, ownerId } = await ownerContext(clinicId);
  if (!(await activeDoctorBelongsToClinic(supabase, clinicId, assignedDoctorId))) {
    return { status: "error", message: "Choose the doctor this receptionist will work with.", email };
  }

  const { data: existingMember, error: memberLookupError } = await supabase
    .from("clinic_members")
    .select("user_id")
    .eq("clinic_id", clinicId)
    .eq("role", "receptionist")
    .maybeSingle();

  if (memberLookupError && memberLookupError.code !== "PGRST116") {
    console.error("Atlas clinic membership lookup failed", { code: memberLookupError.code });
  }

  const admin = createAdminClient();
  let authUser: User | null = null;

  try {
    authUser = await findUserByEmail(email);
    if (!authUser) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: false,
        user_metadata: { atlas_provisioned_by_clinic: clinicId },
      });
      if (error || !data.user) throw error ?? new Error("user_create_failed");
      authUser = data.user;
    }
  } catch (error) {
    console.error("Atlas receptionist invitation user preparation failed", { error: error instanceof Error ? error.message : "unknown" });
    return { status: "error", message: "Atlas could not prepare this receptionist invitation. Try again.", email };
  }

  if (authUser.id === ownerId) {
    return { status: "error", message: "This account already owns the clinic.", email };
  }

  const { data: exactMember, error: exactMemberError } = await supabase
    .from("clinic_members")
    .select("user_id")
    .eq("clinic_id", clinicId)
    .eq("user_id", authUser.id)
    .maybeSingle();

  if (exactMemberError) {
    console.error("Atlas receptionist membership lookup failed", { code: exactMemberError.code });
    return { status: "error", message: "Atlas could not check this receptionist's access. Try again.", email };
  }
  if (exactMember) {
    return { status: "error", message: "This person already has access to the clinic.", email };
  }

  const invitation: PendingStaffInvitation = {
    clinic_id: clinicId,
    role: "receptionist",
    assigned_doctor_id: assignedDoctorId,
    invited_at: new Date().toISOString(),
    invited_by: ownerId,
  };

  const { error: metadataError } = await admin.auth.admin.updateUserById(authUser.id, {
    app_metadata: withPendingStaffInvitation(authUser.app_metadata, invitation),
  });

  if (metadataError) {
    console.error("Atlas receptionist invitation metadata save failed", { message: metadataError.message });
    return { status: "error", message: "Atlas could not save this receptionist invitation. Try again.", email };
  }

  let emailError: Error | null = null;
  try {
    const invitationAuth = createInvitationAuthClient();
    const { error } = await invitationAuth.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${atlasSiteUrl()}/auth/invite`,
      },
    });
    if (error) emailError = error;
  } catch (error) {
    emailError = error instanceof Error ? error : new Error("invite_email_failed");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/settings");

  if (emailError) {
    console.error("Atlas receptionist invitation email failed", { message: emailError.message });
    return {
      status: "error",
      message: "The invitation is pending, but Atlas could not send the email yet. Tap Add receptionist again to retry.",
      email,
    };
  }

  return {
    status: "success",
    message: "Invitation sent. Access stays Pending until the receptionist opens the Atlas email.",
    email,
  };
}

export async function provisionStaffMember(
  _previousState: StaffProvisionState,
  formData: FormData,
): Promise<StaffProvisionState> {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const role = String(formData.get("role") ?? "receptionist");
  const assignedDoctorId = String(formData.get("assigned_doctor_id") ?? "");

  if (!isUuid(clinicId) || !validEmail(email) || role !== "receptionist") {
    return { status: "error", message: "Check the receptionist email and try again." };
  }

  return prepareReceptionistInvitation(clinicId, email, assignedDoctorId);
}

export async function addStaffMember(formData: FormData) {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const role = String(formData.get("role") ?? "receptionist");
  const assignedDoctorId = String(formData.get("assigned_doctor_id") ?? "");

  if (!isUuid(clinicId) || !validEmail(email) || role !== "receptionist") {
    redirect(staffUrl(clinicId, "error", "invalid"));
  }

  const result = await prepareReceptionistInvitation(clinicId, email, assignedDoctorId);
  if (result.status === "error") redirect(staffUrl(clinicId, "error", "invite_failed"));
  redirect(staffUrl(clinicId, "notice", "invited"));
}

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
