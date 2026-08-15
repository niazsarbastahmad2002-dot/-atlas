import type { Metadata } from "next";
import { baghdadDateTime } from "@/lib/i18n/config";
import { hashPatientToken, isPatientToken } from "@/lib/patient-links";
import { createAdminClient } from "@/lib/supabase/admin";
import { updatePatientAppointment } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Appointment — Atlas",
  robots: { index: false, follow: false },
};

type PatientPageProps = {
  params: Promise<{ token: string }>;
};

type PatientAppointment = {
  clinic_name: string;
  doctor_name: string;
  appointment_at: string;
  appointment_status: string;
  reminder_language: string;
  token_expires_at: string;
};

const statusLabels: Record<string, string> = {
  pending: "Pending confirmation",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
  no_show: "No-show",
};

const languageLabels: Record<string, string> = {
  ku: "Kurdish (Sorani)",
  ar: "Arabic",
  en: "English",
};

export default async function PatientAppointmentPage({ params }: PatientPageProps) {
  const { token } = await params;
  if (!isPatientToken(token)) return <Unavailable />;

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return <Unavailable />;
  }

  const tokenHash = hashPatientToken(token);
  const bucketHash = hashPatientToken(`patient-view:${token}`);
  const { data: allowed, error: limitError } = await admin.rpc(
    "consume_patient_link_rate_limit",
    { p_bucket_hash: bucketHash },
  );
  if (limitError || allowed !== true) return <Unavailable />;

  const { data, error } = await admin.rpc("get_patient_appointment", {
    p_token_hash: tokenHash,
  });
  const appointment = Array.isArray(data) ? data[0] as PatientAppointment | undefined : undefined;
  if (error || !appointment) return <Unavailable />;

  const canConfirm = appointment.appointment_status === "pending";
  const canCancel = ["pending", "confirmed"].includes(appointment.appointment_status);

  return (
    <main className="center-page">
      <section className="auth-card patient-card">
        <a className="brand" href="/">Atlas</a>
        <div className="eyebrow">Your appointment</div>
        <h1>{appointment.clinic_name}</h1>
        <dl className="appointment-details">
          <div><dt>Doctor</dt><dd>{appointment.doctor_name}</dd></div>
          <div><dt>Date & time</dt><dd>{baghdadDateTime.format(new Date(appointment.appointment_at))}</dd></div>
          <div><dt>Status</dt><dd>{statusLabels[appointment.appointment_status] ?? appointment.appointment_status}</dd></div>
          <div><dt>Reminder language</dt><dd>{languageLabels[appointment.reminder_language] ?? appointment.reminder_language}</dd></div>
        </dl>

        {canConfirm || canCancel ? (
          <div className="row-actions" aria-label="Patient appointment actions">
            {canConfirm ? (
              <form action={updatePatientAppointment.bind(null, token, "confirmed")}>
                <button className="button" type="submit">Confirm appointment</button>
              </form>
            ) : null}
            {canCancel ? (
              <form action={updatePatientAppointment.bind(null, token, "cancelled")}>
                <button className="button button-ghost" type="submit">Cancel appointment</button>
              </form>
            ) : null}
          </div>
        ) : null}

        <p className="quiet">
          This private link only shows this appointment. It does not provide access to the clinic schedule.
        </p>
      </section>
    </main>
  );
}

function Unavailable() {
  return (
    <main className="center-page">
      <section className="auth-card">
        <a className="brand" href="/">Atlas</a>
        <div className="eyebrow">Private appointment link</div>
        <h1>This link is unavailable.</h1>
        <p className="quiet">It may be invalid, expired, replaced, or temporarily rate-limited. Contact the clinic for a new link.</p>
      </section>
    </main>
  );
}
