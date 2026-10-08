"use server";

import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/appointments";
import { createClient } from "@/lib/supabase/server";

export type HistoryDeleteResult =
  | { ok: true; deleted: number }
  | { ok: false; error: "invalid" | "not_allowed" | "failed" };

export async function deleteArchivedAppointments(
  clinicId: string,
  appointmentIds: string[],
): Promise<HistoryDeleteResult> {
  const uniqueIds = [...new Set(appointmentIds)].filter(isUuid);
  if (!isUuid(clinicId) || uniqueIds.length === 0 || uniqueIds.length > 250 || uniqueIds.length !== appointmentIds.length) {
    return { ok: false, error: "invalid" };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { ok: false, error: "not_allowed" };

  const [{ data: clinic, error: clinicError }, { data: membership, error: membershipError }] = await Promise.all([
    supabase.from("clinics").select("id, owner_id").eq("id", clinicId).maybeSingle(),
    supabase
      .from("clinic_members")
      .select("role")
      .eq("clinic_id", clinicId)
      .eq("user_id", userData.user.id)
      .maybeSingle(),
  ]);
  if (clinicError || !clinic) return { ok: false, error: "not_allowed" };
  const isClinicOwner = clinic.owner_id === userData.user.id;
  if (!isClinicOwner && membershipError) return { ok: false, error: "not_allowed" };
  const canDelete = isClinicOwner || membership?.role === "owner" || membership?.role === "manager";
  if (!canDelete) return { ok: false, error: "not_allowed" };

  const { data, error } = await supabase
    .from("appointments")
    .delete()
    .eq("clinic_id", clinicId)
    .in("id", uniqueIds)
    .not("voided_at", "is", null)
    .select("id");

  if (error) {
    if (error.code === "42501") return { ok: false, error: "not_allowed" };
    console.error("Atlas history permanent delete failed", { code: error.code });
    return { ok: false, error: "failed" };
  }

  if ((data?.length ?? 0) !== uniqueIds.length) return { ok: false, error: "not_allowed" };

  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard");
  return { ok: true, deleted: data?.length ?? 0 };
}
