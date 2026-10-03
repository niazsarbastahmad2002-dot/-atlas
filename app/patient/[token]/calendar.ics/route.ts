import { buildPatientCalendar } from "@/lib/patient-calendar";
import { hashPatientToken, isPatientToken } from "@/lib/patient-links";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type CalendarRouteProps = {
  params: Promise<{ token: string }>;
};

function unavailable() {
  return new Response("Appointment calendar unavailable.", {
    status: 404,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(_request: Request, { params }: CalendarRouteProps) {
  const { token } = await params;
  if (!isPatientToken(token)) return unavailable();

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return unavailable();
  }

  const tokenHash = hashPatientToken(token);
  const bucketHash = hashPatientToken(`patient-calendar:${token}`);
  const { data: allowed, error: limitError } = await admin.rpc(
    "consume_patient_link_rate_limit",
    { p_bucket_hash: bucketHash },
  );
  if (limitError || allowed !== true) return unavailable();

  const { data, error } = await admin.rpc("get_patient_appointment", {
    p_token_hash: tokenHash,
  });
  const appointment = Array.isArray(data) ? data[0] : undefined;

  if (
    error
    || !appointment
    || !["pending", "confirmed"].includes(appointment.appointment_status)
  ) {
    return unavailable();
  }

  const calendar = buildPatientCalendar({
    clinicName: appointment.clinic_name,
    doctorName: appointment.doctor_name,
    doctorSpecialty: appointment.doctor_specialty,
    appointmentAt: appointment.appointment_at,
    appointmentIntervalMinutes: appointment.appointment_interval_minutes,
    uidSeed: tokenHash,
  });

  return new Response(calendar, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": 'attachment; filename="atlas-appointment.ics"',
      "Content-Type": "text/calendar; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
