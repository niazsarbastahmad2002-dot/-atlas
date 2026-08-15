"use server";

import { revalidatePath } from "next/cache";
import {
  classifyAppointmentMutationError,
  isAppointmentStatus,
  isUuid,
  type AppointmentMutationFailure,
  type AppointmentStatus,
} from "@/lib/appointments";
import { createClient } from "@/lib/supabase/server";

export type InlineAppointmentResult =
  | { ok: true; status?: AppointmentStatus; archived?: boolean }
  | { ok: false; reason: AppointmentMutationFailure };

export async function updateAppointmentStatusInline(
  clinicId: string,
  id: string,
  status: string,
): Promise<InlineAppointmentResult> {
  if (!isUuid(clinicId) || !isUuid(id) || !isAppointmentStatus(status)) {
    return { ok: false, reason: "invalid" };
  }

  // Keep the interaction fast with one write. RLS scopes it to the signed-in
  // clinic user, while database triggers atomically enforce transitions/timing.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("clinic_id", clinicId)
    .eq("id", id)
    .is("voided_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    const reason = classifyAppointmentMutationError(error.code, error.message);
    if (reason === "failed") {
      console.error("Atlas inline appointment status update failed", { code: error.code });
    }
    return { ok: false, reason };
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

  if (error) {
    const reason = classifyAppointmentMutationError(error.code, error.message);
    if (reason === "failed") {
      console.error("Atlas inline appointment archive failed", { code: error.code });
    }
    return { ok: false, reason };
  }
  if (!data) return { ok: false, reason: "failed" };

  revalidatePath("/dashboard");
  return { ok: true, archived: true };
}
