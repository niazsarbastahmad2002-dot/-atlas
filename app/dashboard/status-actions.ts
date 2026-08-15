"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  canTransitionAppointment,
  isAppointmentStatus,
  isUuid,
} from "@/lib/appointments";
import type { DashboardMessageCode } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

function dashboardUrl(
  key: "error" | "notice",
  value: DashboardMessageCode,
  clinicId?: string,
) {
  const params = new URLSearchParams({ [key]: value });
  if (clinicId && isUuid(clinicId)) params.set("clinic", clinicId);
  return `/dashboard?${params}`;
}

function success(clinicId: string): never {
  revalidatePath("/dashboard");
  redirect(dashboardUrl("notice", "appointment_updated", clinicId));
}

export async function updateAppointmentStatusReliable(
  clinicId: string,
  id: string,
  status: string,
) {
  if (!isUuid(clinicId) || !isUuid(id) || !isAppointmentStatus(status)) {
    redirect(dashboardUrl("error", "appointment_status_invalid", clinicId));
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const { data: current, error: readError } = await supabase
    .from("appointments")
    .select("id, status")
    .eq("clinic_id", clinicId)
    .eq("id", id)
    .is("voided_at", null)
    .maybeSingle();

  if (readError || !current || !isAppointmentStatus(current.status)) {
    redirect(dashboardUrl("error", "appointment_update_failed", clinicId));
  }

  // A repeated tap, browser retry, or slow response should be harmless.
  if (current.status === status) success(clinicId);

  if (!canTransitionAppointment(current.status, status)) {
    redirect(dashboardUrl("error", "appointment_status_invalid", clinicId));
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

  if (error?.code === "55P03") {
    redirect(dashboardUrl("error", "appointment_update_busy", clinicId));
  }
  if (error?.code === "23514") {
    redirect(dashboardUrl("error", "appointment_status_invalid", clinicId));
  }
  if (error) {
    console.error("Atlas appointment status update failed", { code: error.code });
    redirect(dashboardUrl("error", "appointment_update_failed", clinicId));
  }

  if (!data) {
    // Another request may have completed the same transition after our first read.
    const { data: latest } = await supabase
      .from("appointments")
      .select("status")
      .eq("clinic_id", clinicId)
      .eq("id", id)
      .is("voided_at", null)
      .maybeSingle();
    if (latest?.status === status) success(clinicId);
    redirect(dashboardUrl("error", "appointment_update_failed", clinicId));
  }

  success(clinicId);
}
