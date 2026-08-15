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
import {
  createAppointment,
  createClinic,
  createDoctor,
  moveDoctor,
  setDoctorActive,
  signOut,
  updateClinicInterval,
  updateDoctor,
} from "./actions";
import { AppointmentActions } from "./appointment-actions";
import { AppointmentTimeField } from "./appointment-time-field";

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

const reminderLanguageLabels: Record<string, string> = {
  ku: "Kurdish (Sorani)",
  ar: "Arabic",
  en: "English",
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
    .select("id, name, owner_id, appointment_interval_minutes")
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

  const [
    { data: appointments, error: appointmentError },
    { data: reminderSettings },
    { data: doctors, error: doctorsError },
    { data: membership },
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, patient_name, patient_phone, doctor_id, doctor_name, appointment_at, status, reminder_status, reminder_language")
      .eq("clinic_id", clinic.id)
      .is("voided_at", null)
      .order("appointment_at", { ascending: true })
      .limit(500),
    supabase
      .from("clinic_reminder_settings")
      .select("enabled, lead_minutes, default_reminder_language")
      .eq("clinic_id", clinic.id)
      .maybeSingle(),
    supabase
      .from("doctors")
      .select("id, name, active, display_order")
      .eq("clinic_id", clinic.id)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("clinic_members")
      .select("role")
      .eq("clinic_id", clinic.id)
      .eq("user_id", userData.user.id)
      .maybeSingle(),
  ]);

  if (appointmentError || doctorsError) return <DashboardError />;

  const doctorRows = doctors ?? [];
  const activeDoctorRows = doctorRows.filter((doctor) => doctor.active);
  const canManageClinic = clinic.owner_id === userData.user.id
    || membership?.role === "owner"
    || membership?.role === "manager";
  const rows = appointments ?? [];
  const today = baghdadDate.format(new Date());
  const todayRows = rows.filter((row) => baghdadDate.format(new Date(row.appointment_at)) === today);
  const confirmed = todayRows.filter((row) => row.status === "confirmed").length;
  const reminders = todayRows.filter((row) => ["sent", "delivered", "read"].includes(row.reminder_status)).length;
  const minimum = new Date(Date.now() + 5 * 60 * 1000);
  minimum.setSeconds(0, 0);
  const maximum = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000);
  const minimumInput = toBaghdadInputValue(minimum);
  const maximumInput = toBaghdadInputValue(maximum);
  const occupiedByDoctor = rows.reduce<Record<string, string[]>>((result, row) => {
    if (!row.doctor_id || (row.status !== "pending" && row.status !== "confirmed")) return result;
    const values = result[row.doctor_id] ?? [];
    values.push(toBaghdadInputValue(new Date(row.appointment_at)));
    result[row.doctor_id] = values;
    return result;
  }, {});
  const defaultReminderLanguage = reminderSettings?.default_reminder_language ?? "ku";

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

      {canManageClinic ? (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">Clinic settings</div>
              <h1>Doctors & scheduling</h1>
            </div>
          </div>

          <form action={updateClinicInterval} className="stack-form">
            <input type="hidden" name="clinic_id" value={clinic.id} />
            <label htmlFor="appointment_interval_minutes">Default appointment interval</label>
            <select
              id="appointment_interval_minutes"
              name="appointment_interval_minutes"
              defaultValue={String(clinic.appointment_interval_minutes)}
            >
              {[5, 10, 15, 20, 30].map((minutes) => (
                <option value={minutes} key={minutes}>{minutes} minutes</option>
              ))}
            </select>
            <p className="field-help">Used as the clinic’s scheduling default; staff can still choose a custom appointment time.</p>
            <SubmitButton pendingLabel="Saving…">Save interval</SubmitButton>
          </form>

          <form action={createDoctor} className="stack-form">
            <input type="hidden" name="clinic_id" value={clinic.id} />
            <label htmlFor="new_doctor_name">Add doctor</label>
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
            <div className="appointment-list" aria-label="Doctor management">
              {doctorRows.map((doctor, index) => (
                <article className="appointment-row" key={doctor.id}>
                  <form action={updateDoctor} className="stack-form">
                    <input type="hidden" name="clinic_id" value={clinic.id} />
                    <input type="hidden" name="doctor_id" value={doctor.id} />
                    <label htmlFor={`doctor-${doctor.id}`}>Doctor name</label>
                    <input
                      id={`doctor-${doctor.id}`}
                      name="doctor_name"
                      defaultValue={doctor.name}
                      minLength={2}
                      maxLength={120}
                      required
                    />
                    <SubmitButton pendingLabel="Saving…">Save name</SubmitButton>
                  </form>
                  <div className="row-actions">
                    <form action={moveDoctor.bind(null, clinic.id, doctor.id, "up")}>
                      <button type="submit" disabled={index === 0}>Move up</button>
                    </form>
                    <form action={moveDoctor.bind(null, clinic.id, doctor.id, "down")}>
                      <button type="submit" disabled={index === doctorRows.length - 1}>Move down</button>
                    </form>
                    <form action={setDoctorActive.bind(null, clinic.id, doctor.id, !doctor.active)}>
                      <button type="submit">{doctor.active ? "Archive" : "Restore"}</button>
                    </form>
                  </div>
                  <p className="field-help">{doctor.active ? "Available for new appointments." : "Archived; existing appointment history is preserved."}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="field-help">Add a doctor before creating appointments.</p>
          )}
        </section>
      ) : null}

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
            <label htmlFor="doctor_id">Doctor</label>
            <select
              id="doctor_id"
              name="doctor_id"
              defaultValue={activeDoctorRows.length === 1 ? activeDoctorRows[0].id : ""}
              required
              disabled={activeDoctorRows.length === 0}
            >
              {activeDoctorRows.length !== 1 ? <option value="">Choose doctor</option> : null}
              {activeDoctorRows.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
              ))}
            </select>
            <AppointmentTimeField
              intervalMinutes={clinic.appointment_interval_minutes}
              min={minimumInput}
              max={maximumInput}
              occupiedByDoctor={occupiedByDoctor}
              timeZoneLabel={appLocale.timeZoneLabel}
            />
            <label htmlFor="reminder_language">Patient reminder language</label>
            <select id="reminder_language" name="reminder_language" defaultValue={defaultReminderLanguage}>
              {Object.entries(reminderLanguageLabels).map(([value, label]) => (
                <option value={value} key={value}>{label}</option>
              ))}
            </select>
            <label className="checkbox-field" htmlFor="reminder_consent">
              <input id="reminder_consent" name="reminder_consent" type="checkbox" />
              <span>The patient agreed to receive a WhatsApp appointment reminder.</span>
            </label>
            <p className="field-help">A reminder is queued only after consent and clinic messaging approval.</p>
            <SubmitButton pendingLabel="Saving…" disabled={activeDoctorRows.length === 0}>Save appointment</SubmitButton>
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
            <span className="count-pill">{rows.length} active</span>
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
                      <div><dt>Reminder language</dt><dd>{reminderLanguageLabels[appointment.reminder_language] ?? appointment.reminder_language}</dd></div>
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
