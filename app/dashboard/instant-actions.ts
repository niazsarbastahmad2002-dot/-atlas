"use server";

import { revalidatePath } from "next/cache";
import {
  isAppointmentStatus,
  isUuid,
  type AppointmentStatus,
} from "@/lib/appointments";
import { createClient } from "@/lib/supabase/server";

export type InlineAppointmentResult =
  | { ok: true; status?: AppointmentStatus; archived?: boolean }
  | { ok: false; reason: "invalid" | "busy" | "failed" };

export async function updateAppointmentStatusInline(
  clinicId: string,
  id: string,
  status: string,
): Promise<InlineAppointmentResult> {
  if (!isUuid(clinicId) || !isUuid(id) || !isAppointmentStatus(status)) {
    return { ok: false, reason: "invalid" };
  }

  // One database request only. RLS scopes the appointment to the signed-in clinic user,
  // while database triggers enforce the allowed transition and timing rules.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("clinic_id", clinicId)
    .eq("id", id)
    .is("voided_at", null)
    .select("id")
    .maybeSingle();

  if (error?.code === "55P03") return { ok: false, reason: "busy" };
  if (error?.code === "23514" || error?.code === "42501") {
    return { ok: false, reason: "invalid" };
  }
  if (error) {
    console.error("Atlas inline appointment status update failed", { code: error.code });
    return { ok: false, reason: "failed" };
  }
  if (!data) return { ok: false, reason: "failed" };

  revalidatePath("/dashboard");
  return { ok: true, status };
}

export async function archiveAppointmentInline(
  clinicId: string,
  id: string,
): Promise<InlineAppointmentResult> {
  if (!isUuid(clinicId) || !isUuid(id)) return { ok: false, reason: "invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .update({
      status: "voided",
      void_reason: "Removed by clinic staff",
    })
    .eq("clinic_id", clinicId)
    .eq("id", id)
    .is("voided_at", null)
    .select("id")
    .maybeSingle();

  if (error?.code === "55P03") return { ok: false, reason: "busy" };
  if (error?.code === "23514" || error?.code === "42501") {
    return { ok: false, reason: "invalid" };
  }
  if (error) {
    console.error("Atlas inline appointment archive failed", { code: error.code });
    return { ok: false, reason: "failed" };
  }
  if (!data) return { ok: false, reason: "failed" };

  revalidatePath("/dashboard");
  return { ok: true, archived: true };
}
