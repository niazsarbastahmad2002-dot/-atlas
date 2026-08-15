import { redirect } from "next/navigation";
import { isUuid } from "@/lib/appointments";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { uiLocaleMeta, uiText } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/app/components/submit-button";
import {
  createDoctor,
  moveDoctor,
  setDoctorActive,
  setInterfaceLanguage,
  signOut,
  updateClinicInterval,
  updateClinicName,
  updateDoctor,
  updateReminderSettings,
} from "./actions";

export const dynamic = "force-dynamic";

type SettingsPageProps = {
  searchParams: Promise<{ clinic?: string; error?: string; notice?: string }>;
};

const errorCopy: Record<string, string> = {
  manager_required: "Only the clinic owner or a manager can change clinic settings.",
  language_invalid: "Choose a supported interface language.",
  clinic_invalid: "Check the clinic name and try again.",
  interval_invalid: "Choose a valid appointment interval.",
  doctor_invalid: "Check the doctor details and try again.",
  reminders_invalid: "Check the reminder settings and try again.",
  approval_required: "WhatsApp cannot be enabled until the clinic messaging setup is approved server-side.",
  save_failed: "That setting could not be saved. Refresh and try again.",
};

const noticeCopy: Record<string, string> = {
  language_saved: "Interface language updated.",
  clinic_saved: "Clinic details updated.",
  interval_saved: "Appointment interval updated.",
  doctor_saved: "Doctor settings updated.",
  doctor_archived: "Doctor archived. Existing appointment history is preserved.",
  doctor_restored: "Doctor restored.",
  reminders_saved: "Reminder settings updated.",
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const locale = await getUiLocale();
  const t = uiText(locale);
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const { data: clinics, error: clinicsError } = await supabase
    .from("clinics")
    .select("id, name, owner_id, appointment_interval_minutes")
    .order("created_at", { ascending: true });
  if (clinicsError || !clinics?.length) redirect("/dashboard");

  const requestedClinic = params.clinic && isUuid(params.clinic) ? params.clinic : null;
  const clinic = clinics.find((item) => item.id === requestedClinic) ?? clinics[0];

  const [
    { data: membership },
    { data: doctors, error: doctorsError },
    { data: reminderSettings, error: reminderError },
  ] = await Promise.all([
    supabase
      .from("clinic_members")
      .select("role")
      .eq("clinic_id", clinic.id)
      .eq("user_id", userData.user.id)
      .maybeSingle(),
    supabase
      .from("doctors")
      .select("id, name, active, display_order")
      .eq("clinic_id", clinic.id)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("clinic_reminder_settings")
      .select("enabled, lead_minutes, default_reminder_language, messaging_approved_at, template_name, template_language, daily_message_limit")
      .eq("clinic_id", clinic.id)
      .maybeSingle(),
  ]);

  if (doctorsError || reminderError || !reminderSettings) {
    return <SettingsUnavailable label={t.settingsTitle} back={t.backToSchedule} />;
  }

  const canManage = clinic.owner_id === userData.user.id
    || membership?.role === "owner"
    || membership?.role === "manager";
  const isOwner = clinic.owner_id === userData.user.id || membership?.role === "owner";
  const approved = Boolean(reminderSettings.messaging_approved_at);
  const errorMessage = params.error ? errorCopy[params.error] : null;
  const noticeMessage = params.notice ? noticeCopy[params.notice] : null;

  return (
    <main className="settings-page shell">
      <header className="page-heading settings-heading">
        <div>
          <div className="eyebrow">{t.interface}</div>
          <h1>{t.settingsTitle}</h1>
          <p>{t.settingsSubtitle}</p>
        </div>
        <a className="button button-ghost button-small" href={`/dashboard?clinic=${clinic.id}`}>
          {t.backToSchedule}
        </a>
      </header>

      {clinics.length > 1 ? (
        <form className="clinic-switcher settings-clinic-switcher" method="get">
          <label htmlFor="clinic">{t.clinicWorkspace}</label>
          <select id="clinic" name="clinic" defaultValue={clinic.id}>
            {clinics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <button className="button button-ghost button-small" type="submit">{t.switch}</button>
        </form>
      ) : null}

      {errorMessage ? <p className="notice notice-error settings-notice" role="alert">{errorMessage}</p> : null}
      {noticeMessage ? <p className="notice notice-success settings-notice" role="status">{noticeMessage}</p> : null}

      <div className="settings-grid">
        <section className="settings-card settings-card-accent">
          <div className="settings-card-heading">
            <span className="settings-card-icon" aria-hidden="true">文</span>
            <div>
              <div className="eyebrow">{t.interface}</div>
              <h2>{t.interfaceLanguage}</h2>
              <p>{t.interfaceLanguageHelp}</p>
            </div>
          </div>
          <form action={setInterfaceLanguage} className="settings-form settings-form-inline">
            <input type="hidden" name="clinic_id" value={clinic.id} />
            <label className="sr-only" htmlFor="locale">{t.interfaceLanguage}</label>
            <select id="locale" name="locale" defaultValue={locale}>
              {Object.entries(uiLocaleMeta).map(([value, meta]) => (
                <option value={value} key={value}>{meta.nativeLabel}</option>
              ))}
            </select>
            <SubmitButton pendingLabel={t.saving}>{t.saveLanguage}</SubmitButton>
          </form>
        </section>

        <section className="settings-card">
          <div className="settings-card-heading">
            <span className="settings-card-icon" aria-hidden="true">⌂</span>
            <div>
              <div className="eyebrow">{t.clinic}</div>
              <h2>{t.doctorsScheduling}</h2>
              <p>{clinic.name}</p>
            </div>
          </div>

          <form action={updateClinicName} className="settings-form">
            <input type="hidden" name="clinic_id" value={clinic.id} />
            <label htmlFor="clinic_name">{t.clinicName}</label>
            <div className="settings-control-row">
              <input id="clinic_name" name="clinic_name" defaultValue={clinic.name} minLength={2} maxLength={120} disabled={!canManage} required />
              <SubmitButton pendingLabel={t.saving} disabled={!canManage}>{t.saveName}</SubmitButton>
            </div>
          </form>

          <form action={updateClinicInterval} className="settings-form">
            <input type="hidden" name="clinic_id" value={clinic.id} />
            <label htmlFor="appointment_interval_minutes">{t.defaultInterval}</label>
            <div className="settings-control-row">
              <select
                id="appointment_interval_minutes"
                name="appointment_interval_minutes"
                defaultValue={String(clinic.appointment_interval_minutes)}
                disabled={!canManage}
              >
                {[5, 10, 15, 20, 30].map((minutes) => (
                  <option value={minutes} key={minutes}>{minutes} min</option>
                ))}
              </select>
              <SubmitButton pendingLabel={t.saving} disabled={!canManage}>{t.saveInterval}</SubmitButton>
            </div>
            <p className="field-help">{t.intervalHelp}</p>
          </form>
        </section>

        <section className="settings-card settings-card-wide">
          <div className="settings-card-heading">
            <span className="settings-card-icon" aria-hidden="true">+</span>
            <div>
              <div className="eyebrow">{t.clinic}</div>
              <h2>{t.addDoctor}</h2>
              <p>{t.doctorsScheduling}</p>
            </div>
          </div>

          {canManage ? (
            <form action={createDoctor} className="settings-form settings-form-inline">
              <input type="hidden" name="clinic_id" value={clinic.id} />
              <label className="sr-only" htmlFor="new_doctor_name">{t.doctorName}</label>
              <input id="new_doctor_name" name="doctor_name" placeholder={t.doctorName} minLength={2} maxLength={120} required />
              <SubmitButton pendingLabel={t.saving}>{t.addDoctor}</SubmitButton>
            </form>
          ) : null}

          <div className="doctor-settings-list">
            {(doctors ?? []).map((doctor, index) => (
              <article className={`doctor-settings-row ${doctor.active ? "" : "is-archived"}`} key={doctor.id}>
                <form action={updateDoctor} className="doctor-name-form">
                  <input type="hidden" name="clinic_id" value={clinic.id} />
                  <input type="hidden" name="doctor_id" value={doctor.id} />
                  <label className="sr-only" htmlFor={`doctor-${doctor.id}`}>{t.doctorName}</label>
                  <input
                    id={`doctor-${doctor.id}`}
                    name="doctor_name"
                    defaultValue={doctor.name}
                    minLength={2}
                    maxLength={120}
                    disabled={!canManage}
                    required
                  />
                  {canManage ? <SubmitButton pendingLabel={t.saving}>{t.saveName}</SubmitButton> : null}
                </form>
                <div className="doctor-row-meta">
                  <span>{doctor.active ? t.doctorAvailable : t.doctorArchived}</span>
                  {canManage ? (
                    <div className="compact-actions">
                      <form action={moveDoctor.bind(null, clinic.id, doctor.id, "up")}>
                        <button type="submit" disabled={index === 0}>{t.moveUp}</button>
                      </form>
                      <form action={moveDoctor.bind(null, clinic.id, doctor.id, "down")}>
                        <button type="submit" disabled={index === (doctors?.length ?? 0) - 1}>{t.moveDown}</button>
                      </form>
                      <form action={setDoctorActive.bind(null, clinic.id, doctor.id, !doctor.active)}>
                        <button className={doctor.active ? "danger-link" : ""} type="submit">
                          {doctor.active ? t.archive : t.restore}
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-heading">
            <span className="settings-card-icon" aria-hidden="true">◎</span>
            <div>
              <div className="eyebrow">{t.communication}</div>
              <h2>{t.whatsappReminders}</h2>
              <p>{approved ? "Messaging approved" : "Provider approval pending"}</p>
            </div>
          </div>

          <form action={updateReminderSettings} className="settings-form">
            <input type="hidden" name="clinic_id" value={clinic.id} />
            <label className="toggle-row" htmlFor="enabled">
              <span>
                <strong>{t.reminderSettings}</strong>
                <small>{approved ? t.reminderSettingsHelp : t.reminderOff}</small>
              </span>
              <input
                id="enabled"
                name="enabled"
                type="checkbox"
                defaultChecked={reminderSettings.enabled}
                disabled={!canManage || !approved}
              />
            </label>

            <label htmlFor="lead_minutes">Lead time</label>
            <select id="lead_minutes" name="lead_minutes" defaultValue={String(reminderSettings.lead_minutes)} disabled={!canManage}>
              <option value="30">30 min</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="240">4 hours</option>
              <option value="720">12 hours</option>
              <option value="1440">1 day</option>
              <option value="2880">2 days</option>
              <option value="10080">7 days</option>
            </select>

            <label htmlFor="default_reminder_language">{t.reminderLanguage}</label>
            <select id="default_reminder_language" name="default_reminder_language" defaultValue={reminderSettings.default_reminder_language} disabled={!canManage}>
              <option value="ku">کوردی (سۆرانی)</option>
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>

            <p className="field-help">Template: {reminderSettings.template_name} · {reminderSettings.template_language} · limit {reminderSettings.daily_message_limit}/day</p>
            <SubmitButton pendingLabel={t.saving} disabled={!canManage}>{t.saveName}</SubmitButton>
          </form>
        </section>

        <section className="settings-card settings-link-card">
          <div className="settings-card-heading">
            <span className="settings-card-icon" aria-hidden="true">👥</span>
            <div>
              <div className="eyebrow">{t.team}</div>
              <h2>{t.staff}</h2>
              <p>{t.staffHelp}</p>
            </div>
          </div>
          {isOwner ? (
            <a className="settings-link" href={`/dashboard/staff?clinic=${clinic.id}`}>
              <span>{t.manage}</span><span aria-hidden="true">→</span>
            </a>
          ) : (
            <span className="settings-muted-action">Owner access</span>
          )}
        </section>

        <section className="settings-card settings-link-card">
          <div className="settings-card-heading">
            <span className="settings-card-icon" aria-hidden="true">●</span>
            <div>
              <div className="eyebrow">{t.account}</div>
              <h2>{t.signedInAs}</h2>
              <p className="account-email" dir="ltr">{userData.user.email ?? "Atlas user"}</p>
            </div>
          </div>
          <form action={signOut}>
            <SubmitButton className="button button-ghost settings-signout" pendingLabel={t.saving}>{t.signOut}</SubmitButton>
          </form>
        </section>
      </div>
    </main>
  );
}

function SettingsUnavailable({ label, back }: { label: string; back: string }) {
  return (
    <main className="center-page">
      <section className="auth-card">
        <div className="brand">Atlas</div>
        <h1>{label}</h1>
        <p className="notice notice-error">The clinic settings could not load.</p>
        <a className="button" href="/dashboard">{back}</a>
      </section>
    </main>
  );
}
