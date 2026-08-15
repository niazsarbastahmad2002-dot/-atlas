"use server";

import { revalidatePath } from "next/cache";
import { hashPatientToken, isPatientToken } from "@/lib/patient-links";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updatePatientAppointment(token: string, status: string) {
  if (!isPatientToken(token) || !["confirmed", "cancelled"].includes(status)) return;

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return;
  }

  const tokenHash = hashPatientToken(token);
  const bucketHash = hashPatientToken(`patient-mutation:${token}`);
  const { data: allowed, error: limitError } = await admin.rpc(
    "consume_patient_link_rate_limit",
    { p_bucket_hash: bucketHash },
  );
  if (limitError || allowed !== true) return;

  const { error } = await admin.rpc("patient_update_appointment", {
    p_token_hash: tokenHash,
    p_status: status,
  });
  if (error) {
    console.error("Atlas patient appointment update failed", { code: error.code });
    return;
  }

  revalidatePath(`/patient/${token}`);
}
