"use server";

import { revalidatePath } from "next/cache";
import {
  canTransitionAppointment,
  isAppointmentStatus,
  isUuid,
  type AppointmentStatus,
} from "@/lib/appointments";
import { createClient } from "@/lib/supabase/server";

export type InlineAppointmentResult =
  | { ok: true; status?: AppointmentStatus; archived?: boolean }
  | { ok: false; reason: "auth" | "invalid" | "busy" | "failed" };

export async function updateAppointmentStatusInline(
  clinicId: string,
  id: string,
  status: string,
): Promise<InlineAppointmentResult> {
  if (!isUuid(clinicId) || !isUuid(id) || !isAppointmentStatus(status)) {
    return { ok: false, reason: "invalid" };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { ok: false, reason: "auth" };

  const { data: current, error: readError } = await supabase
    .from("appointments")
    .select("id, status")
    .eq("clinic_id", clinicId)
    .eq("id", id)
    .is("voided_at", null)
    .maybeSingle();

  if (readError || !current || !isAppointmentStatus(current.status)) {
    return { ok: false, reason: "failed" };
  }

  if (current.status === status) {
    revalidatePath("/dashboard");
    return { ok: true, status };
  }

  if (!canTransitionAppointment(current.status, status)) {
    return { ok: false, reason: "invalid" };
  }

  const { data, error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("clinic_id", clinicId)
    .eq("id", id)
    .eq("status", current.status)
    .is("voided_at", null)
    .select("id")
    .maybeSingle();

  if (error?.code === "55P03") return { ok: false, reason: "busy" };
  if (error?.code === "23514") return { ok: false, reason: "invalid" };
  if (error) {
    console.error("Atlas inline appointment status update failed", { code: error.code });
    return { ok: false, reason: "failed" };
  }

  if (!data) {
    const { data: latest } = await supabase
      .from("appointments")
      .select("status")
      .eq("clinic_id", clinicId)
      .eq("id", id)
      .is("voided_at", null)
      .maybeSingle();
    if (latest?.status === status) {
      revalidatePath("/dashboard");
      return { ok: true, status };
    }
    return { ok: false, reason: "failed" };
  }

  revalidatePath("/dashboard");
  return { ok: true, status };
}

export async function archiveAppointmentInline(
  clinicId: string,
  id: string,
): Promise<InlineAppointmentResult> {
  if (!isUuid(clinicId) || !isUuid(id)) return { ok: false, reason: "invalid" };

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (userError || !userId) return { ok: false, reason: "auth" };

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

  if (error?.code === "55P03") return { ok: false, reason: "busy" };
  if (error) {
    console.error("Atlas inline appointment archive failed", { code: error.code });
    return { ok: false, reason: "failed" };
  }
  if (!data) return { ok: false, reason: "failed" };

  revalidatePath("/dashboard");
  return { ok: true, archived: true };
}
