"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPatientToken, isPatientToken } from "@/lib/patient-links";
import { setPatientEarlierSlotPreference } from "@/lib/smart-fill/patient-preference";
import { createAdminClient } from "@/lib/supabase/admin";

function patientMutationReturnUrl(token: string, formData: FormData, failed = false) {
  const params = new URLSearchParams();
  const returnLanguage = String(formData.get("return_lang") ?? "");
  if (returnLanguage === "ku" || returnLanguage === "bd" || returnLanguage === "ar" || returnLanguage === "en") {
    params.set("lang", returnLanguage);
  }
  if (formData.get("return_view") === "reminder") params.set("view", "reminder");
  if (failed) params.set("error", "update_failed");
  const query = params.toString();
  return query ? `/patient/${token}?${query}` : `/patient/${token}`;
}

function patientMutationFailureUrl(token: string, formData: FormData) {
  return patientMutationReturnUrl(token, formData, true);
}

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

export async function updatePatientAppointment(token: string, status: string, formData: FormData) {
  if (!["confirmed", "cancelled"].includes(status)) {
    redirect(patientMutationFailureUrl(token, formData));
  }

  const context = await patientMutationAdmin(token);
  if (!context) redirect(patientMutationFailureUrl(token, formData));

  const { error } = await context.admin.rpc("patient_update_appointment", {
    p_token_hash: context.tokenHash,
    p_status: status,
  });
  if (error) {
    console.error("Atlas patient appointment update failed", { code: error.code });
    redirect(patientMutationFailureUrl(token, formData));
  }

  revalidatePath(`/patient/${token}`);
  redirect(patientMutationReturnUrl(token, formData));
}

export async function updateEarlierSlotPreference(token: string, enabled: boolean, formData: FormData) {
  if (typeof enabled !== "boolean") redirect(patientMutationFailureUrl(token, formData));

  const context = await patientMutationAdmin(token);
  if (!context) redirect(patientMutationFailureUrl(token, formData));

  const { updated, error } = await setPatientEarlierSlotPreference(
    context.admin,
    context.tokenHash,
    enabled,
  );
  if (error || !updated) {
    console.error("Atlas earlier-slot preference update failed", {
      code: error?.code ?? "not_updated",
    });
    redirect(patientMutationFailureUrl(token, formData));
  }

  revalidatePath(`/patient/${token}`);
  redirect(patientMutationReturnUrl(token, formData));
}
