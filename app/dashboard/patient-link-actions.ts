"use server";

import { isUuid } from "@/lib/appointments";
import {
  createPatientToken,
  hashPatientToken,
  patientLinkUrl,
} from "@/lib/patient-links";
import { createClient } from "@/lib/supabase/server";

export type PatientLinkState = {
  link: string | null;
  error: string | null;
};

export const initialPatientLinkState: PatientLinkState = {
  link: null,
  error: null,
};

export async function createPatientAccessLink(
  _previousState: PatientLinkState,
  formData: FormData,
): Promise<PatientLinkState> {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const appointmentId = String(formData.get("appointment_id") ?? "");

  if (!isUuid(clinicId) || !isUuid(appointmentId)) {
    return { link: null, error: "Could not create a patient link." };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { link: null, error: "Sign in again before creating a patient link." };
  }

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("id", appointmentId)
    .is("voided_at", null)
    .maybeSingle();

  if (appointmentError || !appointment) {
    return { link: null, error: "That appointment is unavailable." };
  }

  const token = createPatientToken();
  const tokenHash = hashPatientToken(token);
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase.rpc("create_patient_access_token", {
    p_appointment_id: appointmentId,
    p_token_hash: tokenHash,
    p_expires_at: expiresAt,
  });

  if (error || data !== true) {
    console.error("Atlas patient link creation failed", { code: error?.code ?? "rejected" });
    return { link: null, error: "Could not create a patient link. Please try again." };
  }

  try {
    return { link: patientLinkUrl(token), error: null };
  } catch {
    return { link: null, error: "Patient links are not configured on this deployment." };
  }
}
