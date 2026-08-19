import Link from "next/link";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/appointments";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { uiLocaleMeta, uiText, type UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/app/components/submit-button";
import { DoctorPatientDetailsCard } from "../doctor-patient-details-card";
import { SettingsReminderCard } from "../settings-reminder-card";
import { PasskeyManager } from "./passkey-manager";
import {
  createDoctor,
  moveDoctor,
  setDoctorActive,
  setInterfaceLanguage,
  signOut,
  updateClinicInterval,
  updateClinicName,
  updateDoctor,
} from "./actions";

export const dynamic = "force-dynamic";

type SettingsPageProps = {
  searchParams: Promise<{ clinic?: string; error?: string; notice?: string }>;
};

const errorCopy: Record<string, string> = {
  manager_required: "Clinic administration is required to change this setting.",
  language_invalid: "Choose a supported interface language.",
  clinic_invalid: "Check the clinic name and try again.",
  interval_invalid: "Choose a valid appointment interval.",
  doctor_invalid: "Check the doctor details and try again.",
  reminders_invalid: "Check the reminder settings and try again.",
  approval_required: "WhatsApp cannot be enabled until clinic messaging is connected.",
  save_failed: "That setting could not be saved. Refresh and try again.",
};

const noticeCopy: Record<string, string> = {
  language_saved: "Interface language updated.",
  clinic_saved: "Clinic details updated.",
  interval_saved: "Appointment interval updated.",
  doctor_saved: "Doctor settings updated.",
  doctor_archived: "Doctor removed from new appointments. Existing appointment history is preserved.",
  doctor_restored: "Doctor restored.",
  reminders_saved: "Reminder settings updated.",
};

const settingsCopy: Record<UiLocale, {
  clinicBasics: string;
  clinicBasicsHelp: string;
  doctors: string;
  doctorsHelp: string;
  access: string;
  accessHelp: string;
  manageAccess: string;
  accountHelp: string;
  signOutHelp: string;
  readOnlyClinic: string;
}> = {
  en: {
    clinicBasics: "Clinic & scheduling",
    clinicBasicsHelp: "The few defaults reception uses every day.",
    doctors: "Doctors",
    doctorsHelp: "Add doctors, rename them, or remove them from new appointments.",
    access: "Clinic access",
    accessHelp: "Add or remove reception staff without changing the daily schedule experience.",
    manageAccess: "Manage clinic access",
    accountHelp: "Atlas normally keeps this trusted device signed in.",
    signOutHelp: "Sign out only when you want this device to require sign-in again.",
    readOnlyClinic: "Clinic administration manages the clinic name.",
  },
  ku: {
    clinicBasics: "کلینیک و خشتەی کات",
    clinicBasicsHelp: "ئەو ڕێکخستنە سادانەی پێشخانە ڕۆژانە بەکاریان دەهێنێت.",
    doctors: "پزیشکەکان",
    doctorsHelp: "پزیشک زیاد بکە، ناوی بگۆڕە، یان لە وادە نوێکان لایببە.",
    access: "دەسەڵاتی کلینیک",
    accessHelp: "ستافی پێشخانە زیاد یان لاببە، بەبێ ئاڵۆزکردنی خشتەی ڕۆژانە.",
    manageAccess: "بەڕێوەبردنی دەسەڵاتی کلینیک",
    accountHelp: "Atlas بە ئاسایی ئەم ئامێرە متمانەپێکراوە بە چوونەژوورەوە دەهێڵێتەوە.",
    signOutHelp: "تەنها کاتێک بچۆ دەرەوە کە دەتەوێت ئەم ئامێرە دووبارە داوای چوونەژوورەوە بکات.",
    readOnlyClinic: "بەڕێوەبەری کلینیک ناوی کلینیک بەڕێوە دەبات.",
  },
  ar: {
    clinicBasics: "العيادة والجدولة",
    clinicBasicsHelp: "الإعدادات القليلة التي يستخدمها الاستقبال كل يوم.",
    doctors: "الأطباء",
    doctorsHelp: "أضف الأطباء أو غيّر أسماءهم أو أوقف ظهورهم في المواعيد الجديدة.",
    access: "صلاحيات العيادة",
    accessHelp: "أضف أو أزل موظفي الاستقبال دون تعقيد الجدول اليومي.",
    manageAccess: "إدارة صلاحيات العيادة",
    accountHelp: "يبقي Atlas هذا الجهاز الموثوق مسجلاً للدخول عادةً.",
    signOutHelp: "سجّل الخروج فقط عندما تريد أن يطلب هذا الجهاز تسجيل الدخول من جديد.",
    readOnlyClinic: "تدير إدارة العيادة اسم العيادة.",
  },
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const locale = await getUiLocale();
  const t = uiText(locale);
  const copy = settingsCopy[locale];
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
      .select("enabled, lead_minutes, second_lead_minutes, default_reminder_language, messaging_approved_at")
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
  const errorMessage = params.error ? errorCopy[params.error] : null;
  const noticeMessage = params.notice ? noticeCopy[params.notice] : null;

  return (
    <main className={`settings-page shell ${canManage ? "is-administration" : "is-reception"}`}>
      <header className="page-heading settings-heading">
        <div>
          <div className="eyebrow">{t.interface}</div>
          <h1>{t.settingsTitle}</h1>
          <p>{t.settingsSubtitle}</p>
        </div>
        <Link className="button button-ghost button-small" href={`/dashboard?clinic=${clinic.id}`} prefetch>
          {t.backToSchedule}
        </Link>
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
              <h2>{copy.clinicBasics}</h2>
              <p>{copy.clinicBasicsHelp}</p>
            </div>
          </div>

          {canManage ? (
            <form action={updateClinicName} className="settings-form">
              <input type="hidden" name="clinic_id" value={clinic.id} />
              <label htmlFor="clinic_name">{t.clinicName}</label>
              <div className="settings-control-row">
                <input id="clinic_name" name="clinic_name" defaultValue={clinic.name} minLength={2} maxLength={120} required />
                <SubmitButton pendingLabel={t.saving}>{t.saveName}</SubmitButton>
              </div>
            </form>
          ) : (
            <div className="settings-readonly-clinic">
              <span>{t.clinicName}</span><strong>{clinic.name}</strong><small>{copy.readOnlyClinic}</small>
            </div>
          )}

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
              {canManage ? <SubmitButton pendingLabel={t.saving}>{t.saveInterval}</SubmitButton> : null}
            </div>
            <p className="field-help">{t.intervalHelp}</p>
          </form>
        </section>

        <DoctorPatientDetailsCard clinicId={clinic.id} locale={locale} />

        <SettingsReminderCard
          clinicId={clinic.id}
          locale={locale}
          canManage={Boolean(canManage)}
          initialSettings={{
            enabled: reminderSettings.enabled,
            leadMinutes: reminderSettings.lead_minutes,
            secondLeadMinutes: reminderSettings.second_lead_minutes,
            defaultLanguage: reminderSettings.default_reminder_language,
            approved: Boolean(reminderSettings.messaging_approved_at),
          }}
        />

        {canManage ? (
          <section className="settings-card settings-card-wide">
            <div className="settings-card-heading">
              <span className="settings-card-icon" aria-hidden="true">+</span>
              <div>
                <div className="eyebrow">{t.clinic}</div>
                <h2>{copy.doctors}</h2>
                <p>{copy.doctorsHelp}</p>
              </div>
            </div>

            <form action={createDoctor} className="settings-form settings-form-inline">
              <input type="hidden" name="clinic_id" value={clinic.id} />
              <label className="sr-only" htmlFor="new_doctor_name">{t.doctorName}</label>
              <input id="new_doctor_name" name="doctor_name" placeholder={t.doctorName} minLength={2} maxLength={120} required />
              <SubmitButton pendingLabel={t.saving}>{t.addDoctor}</SubmitButton>
            </form>

            <div className="doctor-settings-list">
              {(doctors ?? []).map((doctor, index) => (
                <article className={`doctor-settings-row ${doctor.active ? "" : "is-archived"}`} key={doctor.id}>
                  <form action={updateDoctor} className="doctor-name-form">
                    <input type="hidden" name="clinic_id" value={clinic.id} />
                    <input type="hidden" name="doctor_id" value={doctor.id} />
                    <label className="sr-only" htmlFor={`doctor-${doctor.id}`}>{t.doctorName}</label>
                    <input id={`doctor-${doctor.id}`} name="doctor_name" defaultValue={doctor.name} minLength={2} maxLength={120} required />
                    <SubmitButton pendingLabel={t.saving}>{t.saveName}</SubmitButton>
                  </form>
                  <div className="doctor-row-meta">
                    <span>{doctor.active ? t.doctorAvailable : t.doctorArchived}</span>
                    <div className="compact-actions">
                      <form action={moveDoctor.bind(null, clinic.id, doctor.id, "up")}><button type="submit" disabled={index === 0}>{t.moveUp}</button></form>
                      <form action={moveDoctor.bind(null, clinic.id, doctor.id, "down")}><button type="submit" disabled={index === (doctors?.length ?? 0) - 1}>{t.moveDown}</button></form>
                      <form action={setDoctorActive.bind(null, clinic.id, doctor.id, !doctor.active)}>
                        <button className={doctor.active ? "danger-link" : ""} type="submit">{doctor.active ? t.archive : t.restore}</button>
                      </form>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {isOwner ? (
          <section className="settings-card settings-link-card">
            <div className="settings-card-heading">
              <span className="settings-card-icon" aria-hidden="true">👥</span>
              <div>
                <div className="eyebrow">{t.team}</div>
                <h2>{copy.access}</h2>
                <p>{copy.accessHelp}</p>
              </div>
            </div>
            <Link className="settings-link" href={`/dashboard/staff?clinic=${clinic.id}`} prefetch>
              <span>{copy.manageAccess}</span><span aria-hidden="true">→</span>
            </Link>
          </section>
        ) : null}

        <section className="settings-card">
          <div className="settings-card-heading">
            <span className="settings-card-icon" aria-hidden="true">●</span>
            <div>
              <div className="eyebrow">{t.account}</div>
              <h2>{t.signedInAs}</h2>
              <p className="account-email" dir="ltr">{userData.user.email ?? "Atlas user"}</p>
            </div>
          </div>

          <p className="field-help">{copy.accountHelp}</p>
          <PasskeyManager locale={locale} />
          <div className="settings-account-signout">
            <p className="field-help">{copy.signOutHelp}</p>
            <form action={signOut}><SubmitButton className="button button-ghost settings-signout" pendingLabel={t.saving}>{t.signOut}</SubmitButton></form>
          </div>
        </section>
      </div>

      <style>{`
        .settings-readonly-clinic{display:grid;gap:5px;border-radius:12px;padding:12px 14px;background:var(--surface-soft)}.settings-readonly-clinic span,.settings-readonly-clinic small{color:var(--muted);font-size:10px;font-weight:720}.settings-readonly-clinic strong{font-size:17px}.settings-page.is-reception .settings-grid{grid-auto-flow:row dense}.settings-page.is-reception .settings-card{min-height:0}
      `}</style>
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
        <Link className="button" href="/dashboard">{back}</Link>
      </section>
    </main>
  );
}
