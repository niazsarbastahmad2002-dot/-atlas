"use server";

import { revalidatePath } from "next/cache";
import { hashPatientToken, isPatientToken } from "@/lib/patient-links";
import { createAdminClient } from "@/lib/supabase/admin";

async function patientMutationAdmin(token: string) {
  if (!isPatientToken(token)) return null;

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return null;
  }

  const tokenHash = hashPatientToken(token);
  const bucketHash = hashPatientToken(`patient-mutation:${token}`);
  const { data: allowed, error: limitError } = await admin.rpc(
    "consume_patient_link_rate_limit",
    { p_bucket_hash: bucketHash },
  );
  if (limitError || allowed !== true) return null;

  return { admin, tokenHash };
}

export async function updatePatientAppointment(token: string, status: string) {
  if (!["confirmed", "cancelled"].includes(status)) return;

  const context = await patientMutationAdmin(token);
  if (!context) return;

  const { error } = await context.admin.rpc("patient_update_appointment", {
    p_token_hash: context.tokenHash,
    p_status: status,
  });
  if (error) {
    console.error("Atlas patient appointment update failed", { code: error.code });
    return;
  }

  revalidatePath(`/patient/${token}`);
}

export async function updateEarlierSlotPreference(token: string, enabled: boolean) {
  if (typeof enabled !== "boolean") return;

  const context = await patientMutationAdmin(token);
  if (!context) return;

  const { data, error } = await context.admin.rpc("patient_set_earlier_slot_preference", {
    p_token_hash: context.tokenHash,
    p_enabled: enabled,
  });
  if (error || data !== true) {
    console.error("Atlas earlier-slot preference update failed", {
      code: error?.code ?? "not_updated",
    });
    return;
  }

  revalidatePath(`/patient/${token}`);
}
