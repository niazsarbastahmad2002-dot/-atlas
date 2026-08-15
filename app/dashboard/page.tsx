import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import {
  formatIraqiMobile,
  isAppointmentStatus,
  isUuid,
  toBaghdadInputValue,
} from "@/lib/appointments";
import { baghdadDate } from "@/lib/i18n/config";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { formatBaghdadDateTime, formatBaghdadDay, uiText } from "@/lib/i18n/ui";
import { getDashboardMessage } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/app/components/submit-button";
import { createAppointment, createClinic } from "./actions";
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

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const locale = await getUiLocale();
  const t = uiText(locale);
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
        <section className="auth-card setup-card">
          <div className="app-brand setup-brand">
            <span className="app-brand-mark" aria-hidden="true">A</span>
            <span>Atlas</span>
          </div>
          <div className="eyebrow">{t.firstSetup}</div>
          <h1>{t.clinicSetup}</h1>
          <p className="quiet">{t.useSynthetic}</p>
          {messageError ? <p className="notice notice-error" role="alert">{messageError}</p> : null}
          <form action={createClinic} className="stack-form">
            <label htmlFor="name">{t.clinicName}</label>
            <input id="name" name="name" minLength={2} maxLength={120} autoComplete="organization" required />
            <SubmitButton pendingLabel={t.saving}>{t.createWorkspace}</SubmitButton>
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
  ]);

  if (appointmentError || doctorsError) return <DashboardError />;

  const rows = appointments ?? [];
  const activeDoctors = (doctors ?? []).filter((doctor) => doctor.active);
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

  const statusLabels: Record<string, string> = {
    pending: t.pending,
    confirmed: t.confirmed,
    cancelled: t.cancelled,
    completed: t.completed,
    no_show: t.noShow,
  };
  const reminderLabels: Record<string, string> = {
    disabled: t.remindersOff,
    queued: t.reminderQueued,
    processing: t.reminderSending,
    sent: t.reminderSent,
    delivered: t.reminderDelivered,
    read: t.reminderRead,
    failed: t.reminderFailed,
    cancelled: t.reminderCancelled,
  };
  const reminderLanguageLabels: Record<string, string> = {
    ku: "کوردی (سۆرانی)",
    ar: "العربية",
    en: "English",
  };

  return (
    <main className="workspace-page shell">
      <header className="workspace-header">
        <div className="workspace-title-block">
          <div className="eyebrow">{t.todayHeading}</div>
          <h1>{clinic.name}</h1>
          <p>{formatBaghdadDay(new Date(), locale)} · {t.erbilTime}</p>
        </div>
        <a className="button workspace-new-button" href="#new-appointment">+ {t.newAppointment}</a>
      </header>

      {clinics.length > 1 ? (
        <form className="clinic-switcher workspace-switcher" method="get">
          <label htmlFor="clinic">{t.clinicWorkspace}</label>
          <select id="clinic" name="clinic" defaultValue={clinic.id}>
            {clinics.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
          </select>
          <button className="button button-ghost button-small" type="submit">{t.switch}</button>
        </form>
      ) : null}

      {messageError || selectionError ? (
        <p className="notice notice-error workspace-notice" role="alert">{messageError ?? selectionError}</p>
      ) : null}
      {notice ? <p className="notice notice-success workspace-notice" role="status">{notice}</p> : null}

      <section className="stats workspace-stats" aria-label={t.todayAppointments}>
        <Stat label={t.todayAppointments} value={todayRows.length} />
        <Stat label={t.confirmed} value={confirmed} />
        <Stat label={t.remindersSent} value={reminders} />
      </section>

      <div className="workspace-grid">
        <section className="panel appointment-composer" id="new-appointment">
          <div className="panel-heading composer-heading">
            <div>
              <div className="eyebrow">{t.today}</div>
              <h2>{t.newAppointment}</h2>
            </div>
            <span className="composer-shortcut" aria-hidden="true">+</span>
          </div>

          <form action={createAppointment} className="stack-form appointment-form">
            <input type="hidden" name="clinic_id" value={clinic.id} />
            <input type="hidden" name="idempotency_key" value={randomUUID()} />

            <label htmlFor="patient_name">{t.patientName}</label>
            <input id="patient_name" name="patient_name" autoComplete="name" minLength={2} maxLength={120} required />

            <label htmlFor="patient_phone">{t.iraqiMobile}</label>
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
              dir="ltr"
              required
            />
            <p className="field-help" id="phone-help">{t.phoneHelp}</p>

            <label htmlFor="doctor_id">{t.doctor}</label>
            <select
              id="doctor_id"
              name="doctor_id"
              defaultValue={activeDoctors.length === 1 ? activeDoctors[0].id : ""}
              required
              disabled={activeDoctors.length === 0}
            >
              {activeDoctors.length !== 1 ? <option value="">{t.chooseDoctor}</option> : null}
              {activeDoctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
              ))}
            </select>

            <AppointmentTimeField
              intervalMinutes={clinic.appointment_interval_minutes}
              min={minimumInput}
              max={maximumInput}
              occupiedByDoctor={occupiedByDoctor}
              timeZoneLabel={t.erbilTime}
              locale={locale}
            />

            <label htmlFor="reminder_language">{t.reminderLanguage}</label>
            <select id="reminder_language" name="reminder_language" defaultValue={defaultReminderLanguage}>
              {Object.entries(reminderLanguageLabels).map(([value, label]) => (
                <option value={value} key={value}>{label}</option>
              ))}
            </select>

            <label className="checkbox-field consent-card" htmlFor="reminder_consent">
              <input id="reminder_consent" name="reminder_consent" type="checkbox" />
              <span>{t.reminderConsent}</span>
            </label>
            <p className="field-help">{t.reminderConsentHelp}</p>

            <SubmitButton pendingLabel={t.saving} disabled={activeDoctors.length === 0}>{t.saveAppointment}</SubmitButton>
          </form>

          <div className={`reminder-note ${reminderSettings?.enabled ? "reminder-ready" : ""}`}>
            {reminderSettings?.enabled
              ? t.reminderScheduled.replace("{minutes}", String(reminderSettings.lead_minutes))
              : t.reminderOff}
          </div>
          <p className="composer-privacy">{t.privacyNote}</p>
        </section>

        <section className="panel appointments-panel schedule-card">
          <div className="panel-heading schedule-heading">
            <div>
              <div className="eyebrow">{t.schedule}</div>
              <h2>{t.appointments}</h2>
              <p className="panel-subtitle">{t.todaySubheading}</p>
            </div>
            <span className="count-pill">{rows.length} {t.active}</span>
          </div>

          {rows.length === 0 ? (
            <div className="empty-state compact-empty">
              <div><strong>{t.noAppointments}</strong><span>{t.noAppointmentsHelp}</span></div>
            </div>
          ) : (
            <div className="appointment-list polished-appointment-list">
              {rows.map((appointment) => {
                const status = isAppointmentStatus(appointment.status) ? appointment.status : "pending";
                return (
                  <article className="appointment-row polished-appointment" key={appointment.id}>
                    <div className="appointment-primary">
                      <div className="patient-cell">
                        <strong>{appointment.patient_name}</strong>
                        <span><bdi dir="ltr">{formatIraqiMobile(appointment.patient_phone)}</bdi></span>
                      </div>
                      <div className="appointment-badges">
                        <span className={`status status-${status}`}>{statusLabels[status]}</span>
                        <span className="status status-reminder">{reminderLabels[appointment.reminder_status] ?? t.reminderQueued}</span>
                      </div>
                    </div>
                    <dl className="appointment-details polished-details">
                      <div><dt>{t.doctor}</dt><dd>{appointment.doctor_name}</dd></div>
                      <div><dt>{t.time}</dt><dd>{formatBaghdadDateTime(new Date(appointment.appointment_at), locale)}</dd></div>
                      <div><dt>{t.reminderLanguage}</dt><dd>{reminderLanguageLabels[appointment.reminder_language] ?? appointment.reminder_language}</dd></div>
                    </dl>
                    <AppointmentActions clinicId={clinic.id} appointmentId={appointment.id} status={status} locale={locale} />
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
