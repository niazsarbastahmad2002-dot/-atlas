import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import {
  isAppointmentStatus,
  isUuid,
  toBaghdadInputValue,
} from "@/lib/appointments";
import { appLocale, baghdadDate, baghdadDateTime } from "@/lib/i18n/config";
import { getDashboardMessage } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/app/components/submit-button";
import { createAppointment, createClinic, createDoctor, signOut } from "./actions";
import { AppointmentActions } from "./appointment-actions";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<{
    clinic?: string;
    error?: string;
    notice?: string;
  }>;
};

const statusLabels = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
  no_show: "No-show",
} as const;

const reminderLabels: Record<string, string> = {
  disabled: "Reminders off",
  queued: "Reminder queued",
  processing: "Sending reminder",
  sent: "Reminder sent",
  delivered: "Reminder delivered",
  read: "Reminder read",
  failed: "Reminder failed",
  cancelled: "Reminder cancelled",
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const messageError = getDashboardMessage(params.error);
  const notice = getDashboardMessage(params.notice);
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) redirect("/login");

  const { data: clinics, error: clinicsError } = await supabase
    .from("clinics")
    .select("id, name")
    .order("created_at", { ascending: true });

  if (clinicsError) return <DashboardError />;

  if (!clinics?.length) {
    return (
      <main className="center-page">
        <section className="auth-card">
          <div className="brand">Atlas</div>
          <div className="eyebrow">First setup</div>
          <h1>Create your clinic workspace.</h1>
          <p className="quiet">Use invented details during setup and product testing.</p>
          {messageError ? <p className="notice notice-error" role="alert">{messageError}</p> : null}
          <form action={createClinic} className="stack-form">
            <label htmlFor="name">Clinic name</label>
            <input id="name" name="name" minLength={2} maxLength={120} autoComplete="organization" required />
            <SubmitButton pendingLabel="Creating…">Create workspace</SubmitButton>
          </form>
        </section>
      </main>
    );
  }

  const requestedClinic = params.clinic && isUuid(params.clinic) ? params.clinic : null;
  const clinic = clinics.find((item) => item.id === requestedClinic) ?? clinics[0];
  const selectionError = params.clinic && requestedClinic !== clinic.id
    ? getDashboardMessage("clinic_unavailable")
    : null;

  const [{ data: appointments, error: appointmentError }, { data: reminderSettings },{ data: doctors, error: doctorsError },] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, patient_name, patient_phone, doctor_id, doctor_name, appointment_at, status, reminder_status")
      .eq("clinic_id", clinic.id)
      .order("appointment_at", { ascending: true })
      .limit(500),
    supabase
      .from("clinic_reminder_settings")
      .select("enabled, lead_minutes")
      .eq("clinic_id", clinic.id)
      .maybeSingle(),,
    supabase
  .from("doctors")
  .select("id, name, active, display_order")
  .eq("clinic_id", clinic.id)
  .eq("active", true)
  .order("display_order", { ascending: true })
  .order("name", { ascending: true }),
  ]);

  if (appointmentError || doctorsError) return <DashboardError />;
  const doctorRows = doctors ?? [];
  const rows = appointments ?? [];
  const today = baghdadDate.format(new Date());
  const todayRows = rows.filter((row) => baghdadDate.format(new Date(row.appointment_at)) === today);
  const confirmed = todayRows.filter((row) => row.status === "confirmed").length;
  const reminders = todayRows.filter((row) => ["sent", "delivered", "read"].includes(row.reminder_status)).length;
  const minimum = new Date(Date.now() + 5 * 60 * 1000);
  minimum.setSeconds(0, 0);
  const maximum = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000);

  return (
    <main className="dashboard shell">
      <header className="dashboard-header">
        <div>
          <div className="brand">Atlas</div>
          <p className="quiet">{clinic.name} · {appLocale.timeZoneLabel}</p>
        </div>
        <form action={signOut}>
          <SubmitButton className="button button-ghost button-small" pendingLabel="Signing out…">Sign out</SubmitButton>
        </form>
      </header>

      {clinics.length > 1 ? (
        <form className="clinic-switcher" method="get">
          <label htmlFor="clinic">Clinic workspace</label>
          <select id="clinic" name="clinic" defaultValue={clinic.id}>
            {clinics.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
          </select>
          <button className="button button-ghost button-small" type="submit">Switch</button>
        </form>
      ) : null}

      {messageError || selectionError ? (
        <p className="notice notice-error" role="alert">{messageError ?? selectionError}</p>
      ) : null}
      {notice ? <p className="notice notice-success" role="status">{notice}</p> : null}

      <section className="stats" aria-label="Today’s appointment summary">
        <Stat label="Today’s appointments" value={todayRows.length} />
        <Stat label="Confirmed" value={confirmed} />
        <Stat label="Reminders sent" value={reminders} />
      </section>

      <p className="privacy-note">
        Collect only the details needed for scheduling. Do not enter medical notes in Atlas.
      </p>
      <section className="panel">
  <div className="panel-heading">
    <div>
      <div className="eyebrow">Clinic settings</div>
      <h1>Doctors</h1>
    </div>
  </div>

  <form action={createDoctor} className="stack-form">
    <input type="hidden" name="clinic_id" value={clinic.id} />
    <label htmlFor="new_doctor_name">Doctor name</label>
    <input
      id="new_doctor_name"
      name="doctor_name"
      minLength={2}
      maxLength={120}
      required
    />
    <SubmitButton pendingLabel="Adding…">Add doctor</SubmitButton>
  </form>

  {doctorRows.length > 0 ? (
    <p className="field-help">
      {doctorRows.map((doctor) => doctor.name).join(", ")}
    </p>
  ) : (
    <p className="field-help">Add a doctor before creating appointments.</p>
  )}
</section>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div><div className="eyebrow">Reception</div><h1>Add appointment</h1></div>
          </div>
          <form action={createAppointment} className="stack-form">
            <input type="hidden" name="clinic_id" value={clinic.id} />
            <input type="hidden" name="idempotency_key" value={randomUUID()} />
            <label htmlFor="patient_name">Patient name</label>
            <input id="patient_name" name="patient_name" autoComplete="name" minLength={2} maxLength={120} required />
            <label htmlFor="patient_phone">Iraqi mobile number</label>
            <input
              id="patient_phone"
              name="patient_phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={24}
              pattern="(?:[+]?(?:964)|0)7[0-9 ()-]{9,16}"
              placeholder="0750 000 0000"
              aria-describedby="phone-help"
              required
            />
            <p className="field-help" id="phone-help">Atlas stores this in +964 format for reminders.</p>
            <label className="checkbox-field" htmlFor="reminder_consent">
              <input id="reminder_consent" name="reminder_consent" type="checkbox" />
              <span>The patient agreed to receive a WhatsApp appointment reminder.</span>
            </label>
            <p className="field-help">A reminder is queued only after consent and clinic messaging approval.</p>
            <label htmlFor="doctor_id">Doctor</label>
<select
  id="doctor_id"
  name="doctor_id"
  defaultValue={doctorRows.length === 1 ? doctorRows[0].id : ""}
  required
  disabled={doctorRows.length === 0}
>
  {doctorRows.length !== 1 ? <option value="">Choose doctor</option> : null}
  {doctorRows.map((doctor) => (
    <option key={doctor.id} value={doctor.id}>
      {doctor.name}
    </option>
  ))}
</select>
            <label htmlFor="appointment_at">Date and time ({appLocale.timeZoneLabel})</label>
            <input
              id="appointment_at"
              name="appointment_at"
              type="datetime-local"
              min={toBaghdadInputValue(minimum)}
              max={toBaghdadInputValue(maximum)}
              required
            />
            <SubmitButton pendingLabel="Saving…">Save appointment</SubmitButton>
          </form>
          <p className={`reminder-note ${reminderSettings?.enabled ? "reminder-ready" : ""}`}>
            {reminderSettings?.enabled
              ? `WhatsApp reminders are scheduled ${reminderSettings.lead_minutes} minutes before each appointment.`
              : "WhatsApp reminders stay off until an approved provider and template are connected."}
          </p>
        </section>

        <section className="panel appointments-panel">
          <div className="panel-heading">
            <div><div className="eyebrow">Schedule</div><h1>Appointments</h1></div>
            <span className="count-pill">{rows.length} total</span>
          </div>

          {rows.length === 0 ? (
            <div className="empty-state">
              <div><strong>No appointments yet.</strong><span>Add the first appointment using the form.</span></div>
            </div>
          ) : (
            <div className="appointment-list">
              {rows.map((appointment) => {
                const status = isAppointmentStatus(appointment.status) ? appointment.status : "pending";
                return (
                  <article className="appointment-row" key={appointment.id}>
                    <div className="appointment-primary">
                      <div className="patient-cell">
                        <strong>{appointment.patient_name}</strong>
                        <span><bdi dir="ltr">{appointment.patient_phone}</bdi></span>
                      </div>
                      <div className="appointment-badges">
                        <span className={`status status-${status}`}>{statusLabels[status]}</span>
                        <span className="status status-reminder">{reminderLabels[appointment.reminder_status] ?? "Reminder pending"}</span>
                      </div>
                    </div>
                    <dl className="appointment-details">
                      <div><dt>Doctor</dt><dd>{appointment.doctor_name}</dd></div>
                      <div><dt>Time</dt><dd>{baghdadDateTime.format(new Date(appointment.appointment_at))}</dd></div>
                    </dl>
                    <AppointmentActions clinicId={clinic.id} appointmentId={appointment.id} status={status} />
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <article className="stat"><span>{label}</span><strong>{value}</strong></article>;
}

function DashboardError() {
  return (
    <main className="center-page">
      <section className="auth-card">
        <div className="brand">Atlas</div>
        <h1>The clinic workspace could not load.</h1>
        <p className="notice notice-error" role="alert">{getDashboardMessage("workspace_load_failed")}</p>
        <a className="button" href="/dashboard">Try again</a>
      </section>
    </main>
  );
}
