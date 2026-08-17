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
  patientPhone: string | null;
  patientName: string | null;
};

const emptyState = (error: string): PatientLinkState => ({
  link: null,
  error,
  patientPhone: null,
  patientName: null,
});

export async function createPatientAccessLink(
  _previousState: PatientLinkState,
  formData: FormData,
): Promise<PatientLinkState> {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const appointmentId = String(formData.get("appointment_id") ?? "");

  if (!isUuid(clinicId) || !isUuid(appointmentId)) {
    return emptyState("Could not create a patient link.");
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return emptyState("Sign in again before creating a patient link.");
  }

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .select("id, patient_name, patient_phone")
    .eq("clinic_id", clinicId)
    .eq("id", appointmentId)
    .is("voided_at", null)
    .maybeSingle();

  if (appointmentError || !appointment) {
    return emptyState("That appointment is unavailable.");
  }

  const token = createPatientToken();
  const tokenHash = hashPatientToken(token);
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("create_patient_access_token_server", {
    p_actor_id: userData.user.id,
    p_appointment_id: appointmentId,
    p_token_hash: tokenHash,
    p_expires_at: expiresAt,
  });

  if (error || data !== true) {
    console.error("Atlas patient link creation failed", { code: error?.code ?? "rejected" });
    return emptyState("Could not create a patient link. Please try again.");
  }

  try {
    return {
      link: patientLinkUrl(token),
      error: null,
      patientPhone: appointment.patient_phone,
      patientName: appointment.patient_name,
    };
  } catch {
    return emptyState("Patient links are not configured on this deployment.");
  }
}
