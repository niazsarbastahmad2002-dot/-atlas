"use server";

import { isUuid } from "@/lib/appointments";
import {
  createPatientToken,
  hashPatientToken,
  patientLinkUrl,
} from "@/lib/patient-links";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type PatientLinkState = {
  link: string | null;
  error: string | null;
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

  // RLS verifies that the signed-in staff member can read this appointment.
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
  const admin = createAdminClient();

  // This RPC is service-role only and re-checks the actor's clinic membership
  // inside Postgres before touching any patient token row.
  const { data, error } = await admin.rpc("create_patient_access_token_server", {
    p_actor_id: userData.user.id,
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
