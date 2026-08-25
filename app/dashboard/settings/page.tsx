import Link from "next/link";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/appointments";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { uiText, type UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/app/components/submit-button";
import { DoctorWorkflowCard } from "../doctor-workflow-card";
import { PasskeyManager } from "./passkey-manager";
import { PhoneNumberManager } from "./phone-number-manager";
import { InterfaceLanguageControl } from "./interface-language-control";
import {
  createDoctor,
  moveDoctor,
  setDoctorActive,
  signOut,
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
  doctor_invalid: "Check the doctor details and try again.",
  save_failed: "That setting could not be saved. Refresh and try again.",
};

const noticeCopy: Record<string, string> = {
  language_saved: "Interface language updated.",
  clinic_saved: "Clinic details updated.",
  doctor_saved: "Doctor settings updated.",
  doctor_archived: "Doctor removed from new appointments. Existing appointment history is preserved.",
  doctor_restored: "Doctor restored.",
};

const settingsCopy: Record<UiLocale, {
  clinicBasics: string;
  clinicBasicsHelp: string;
  doctors: string;
  doctorsHelp: string;
  removedDoctors: string;
  administration: string;
  administrationHelp: string;
  teamAccess: string;
  history: string;
  deleteClinic: string;
  accountHelp: string;
  accountDeletion: string;
  quickSignIn: string;
  quickSignInHelp: string;
  signOutHelp: string;
  readOnlyClinic: string;
  phonePending: string;
  support: string;
}> = {
  en: {
    clinicBasics: "Clinic",
    clinicBasicsHelp: "Keep the clinic identity simple. Doctor workflow settings live with each doctor below.",
    doctors: "Doctors",
    doctorsHelp: "Add, rename, reorder, or remove doctors from new appointments.",
    removedDoctors: "Removed doctors",
    administration: "Clinic administration",
    administrationHelp: "Less-used owner tools stay here instead of competing with the daily schedule.",
    teamAccess: "Team access",
    history: "Appointment history",
    deleteClinic: "Delete this clinic",
    accountHelp: "Your verified phone is your Atlas identity.",
    accountDeletion: "Account & deletion",
    quickSignIn: "Faster sign-in on this device",
    quickSignInHelp: "Optional. Add a passkey only if you want a quicker trusted-device shortcut.",
    signOutHelp: "Sign out only when you want this device to require sign-in again.",
    readOnlyClinic: "Clinic administration manages the clinic name.",
    phonePending: "Phone not verified yet",
    support: "Help & legal",
  },
  ku: {
    clinicBasics: "کلینیک",
    clinicBasicsHelp: "ناسنامەی کلینیک سادە بێت. ڕێکخستنەکانی کاری پزیشک لەگەڵ هەر پزیشکێک لە خوارەوەن.",
    doctors: "پزیشکەکان",
    doctorsHelp: "پزیشک زیاد بکە، ناوی بگۆڕە، ڕیزی بگۆڕە، یان لە وادە نوێکان لایببە.",
    removedDoctors: "پزیشکە لابراوەکان",
    administration: "بەڕێوەبردنی کلینیک",
    administrationHelp: "ئامرازە کەم‌بەکارهاتووەکانی خاوەن کلینیک لێرە دەمێنن تا خشتەی ڕۆژانە سادە بێت.",
    teamAccess: "دەسەڵاتی ستاف",
    history: "مێژووی وادەکان",
    deleteClinic: "سڕینەوەی ئەم کلینیکە",
    accountHelp: "ژمارەی پشتڕاستکراوی مۆبایل ناسنامەی Atlas ـەکەتە.",
    accountDeletion: "هەژمار و سڕینەوە",
    quickSignIn: "چوونەژوورەوەی خێراتر لەم ئامێرە",
    quickSignInHelp: "ئارەزوومەندانەیە. تەنها ئەگەر ڕێگایەکی خێراتر لە ئامێری متمانەپێکراو دەوێت Passkey زیاد بکە.",
    signOutHelp: "تەنها کاتێک بچۆ دەرەوە کە دەتەوێت ئەم ئامێرە دووبارە چوونەژوورەوە بخوازێت.",
    readOnlyClinic: "بەڕێوەبەری کلینیک ناوی کلینیک بەڕێوە دەبات.",
    phonePending: "ژمارەی مۆبایل هێشتا پشتڕاست نەکراوەتەوە",
    support: "یارمەتی و یاسایی",
  },
  bd: {
    clinicBasics: "کلینیک",
    clinicBasicsHelp: "ناسناما کلینیکێ سادە بیت. ڕێکخستنێن کارێ دکتۆری لگەل هەر دکتۆرەکی ل خوارێ نە.",
    doctors: "دکتۆر",
    doctorsHelp: "دکتۆر زێدە بکە، ناڤێ وان بگۆڕە، ڕێزێ بگۆڕە، یان ژ وادەیێن نوو لاببە.",
    removedDoctors: "دکتۆرێن لابری",
    administration: "بەڕێڤەبرنا کلینیکێ",
    administrationHelp: "ئامرازێن کێم‌بکارهاتی یێن خودانێ کلینیکێ ل ڤێرێ دمینن دا خشتەیا ڕۆژانە سادە بیت.",
    teamAccess: "دەستهەلاتا ستافی",
    history: "مێژوویا وادەیان",
    deleteClinic: "ژێبرنا ڤێ کلینیکێ",
    accountHelp: "ژمارا پشتڕاستکری یا موبایلێ ناسناما Atlas یا تەیە.",
    accountDeletion: "هەژمار و ژێبرن",
    quickSignIn: "چوونەژوورا خێراتر ل ڤی ئامێری",
    quickSignInHelp: "ئارەزوومەندانەیە. تەنێ ئەگەر ڕێکا خێراتر ل ئامێرێ متمانەپێکری دخوازیت Passkey زێدە بکە.",
    signOutHelp: "تەنێ دەمێ تو دخوازیت ئەڤ ئامێرە دووبارە چوونەژوور بخوازیت بچۆ دەرڤە.",
    readOnlyClinic: "بەڕێڤەبرنا کلینیکێ ناڤێ کلینیکێ بەڕێڤە دبەت.",
    phonePending: "ژمارا موبایلێ هێشتا نەهاتییە پشتڕاستکرن",
    support: "هاریکاری و یاسایی",
  },
  ar: {
    clinicBasics: "العيادة",
    clinicBasicsHelp: "خلي هوية العيادة بسيطة. إعدادات عمل كل طبيب موجودة معه بالأسفل.",
    doctors: "الأطباء",
    doctorsHelp: "أضف الأطباء أو غيّر أسماءهم أو ترتيبهم أو أوقف ظهورهم في المواعيد الجديدة.",
    removedDoctors: "الأطباء المُزالون",
    administration: "إدارة العيادة",
    administrationHelp: "أدوات المالك الأقل استخداماً تبقى هنا حتى يظل الجدول اليومي بسيطاً.",
    teamAccess: "صلاحيات الفريق",
    history: "سجل المواعيد",
    deleteClinic: "حذف هذه العيادة",
    accountHelp: "رقم الهاتف الموثق هو هويتك في Atlas.",
    accountDeletion: "الحساب والحذف",
    quickSignIn: "دخول أسرع على هذا الجهاز",
    quickSignInHelp: "اختياري. أضف Passkey فقط إذا تريد اختصاراً أسرع على جهاز موثوق.",
    signOutHelp: "سجّل الخروج فقط عندما تريد أن يطلب هذا الجهاز تسجيل الدخول من جديد.",
    readOnlyClinic: "تدير إدارة العيادة اسم العيادة.",
    phonePending: "رقم الهاتف غير موثق بعد",
    support: "المساعدة والقانوني",
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
    .select("id, name, owner_id")
    .order("created_at", { ascending: true });
  if (clinicsError || !clinics?.length) redirect("/dashboard");

  const requestedClinic = params.clinic && isUuid(params.clinic) ? params.clinic : null;
  const clinic = clinics.find((item) => item.id === requestedClinic) ?? clinics[0];

  const [
    { data: membership },
    { data: doctors, error: doctorsError },
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
  ]);

  if (doctorsError) return <SettingsUnavailable label={t.settingsTitle} back={t.backToSchedule} />;

  const canManage = clinic.owner_id === userData.user.id
    || membership?.role === "owner"
    || membership?.role === "manager";
  const isOwner = clinic.owner_id === userData.user.id || membership?.role === "owner";
  const activeDoctors = (doctors ?? []).filter((doctor) => doctor.active);
  const archivedDoctors = (doctors ?? []).filter((doctor) => !doctor.active);
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
          <InterfaceLanguageControl
            locale={locale}
            label={t.interfaceLanguage}
            savingLabel={t.saving}
            applyLabel={t.saveLanguage}
          />
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
            <div className="settings-readonly-clinic"><span>{t.clinicName}</span><strong>{clinic.name}</strong><small>{copy.readOnlyClinic}</small></div>
          )}
        </section>

        <DoctorWorkflowCard clinicId={clinic.id} locale={locale} canManage={Boolean(canManage)} />

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
              {activeDoctors.map((doctor, index) => (
                <article className="doctor-settings-row" key={doctor.id}>
                  <form action={updateDoctor} className="doctor-name-form">
                    <input type="hidden" name="clinic_id" value={clinic.id} />
                    <input type="hidden" name="doctor_id" value={doctor.id} />
                    <label className="sr-only" htmlFor={`doctor-${doctor.id}`}>{t.doctorName}</label>
                    <input id={`doctor-${doctor.id}`} name="doctor_name" defaultValue={doctor.name} minLength={2} maxLength={120} required />
                    <SubmitButton pendingLabel={t.saving}>{t.saveName}</SubmitButton>
                  </form>
                  <div className="doctor-row-meta">
                    <span>{t.doctorAvailable}</span>
                    <div className="compact-actions">
                      {index > 0 ? <form action={moveDoctor.bind(null, clinic.id, doctor.id, "up")}><button type="submit">{t.moveUp}</button></form> : null}
                      {index < activeDoctors.length - 1 ? <form action={moveDoctor.bind(null, clinic.id, doctor.id, "down")}><button type="submit">{t.moveDown}</button></form> : null}
                      <form action={setDoctorActive.bind(null, clinic.id, doctor.id, false)}><button className="danger-link" type="submit">{t.archive}</button></form>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {archivedDoctors.length ? (
              <details className="settings-disclosure">
                <summary>{copy.removedDoctors} ({archivedDoctors.length})</summary>
                <div className="doctor-settings-list">
                  {archivedDoctors.map((doctor) => (
                    <article className="doctor-settings-row is-archived" key={doctor.id}>
                      <strong>{doctor.name}</strong>
                      <form action={setDoctorActive.bind(null, clinic.id, doctor.id, true)}><button className="button button-ghost button-small" type="submit">{t.restore}</button></form>
                    </article>
                  ))}
                </div>
              </details>
            ) : null}
          </section>
        ) : null}

        {isOwner ? (
          <section className="settings-card settings-link-card">
            <div className="settings-card-heading">
              <span className="settings-card-icon" aria-hidden="true">•••</span>
              <div>
                <div className="eyebrow">{t.team}</div>
                <h2>{copy.administration}</h2>
                <p>{copy.administrationHelp}</p>
              </div>
            </div>
            <div className="settings-link-list">
              <Link className="settings-link" href={`/dashboard/staff?clinic=${clinic.id}`} prefetch><span>{copy.teamAccess}</span><span aria-hidden="true">→</span></Link>
              <Link className="settings-link" href={`/dashboard/history?clinic=${clinic.id}`} prefetch><span>{copy.history}</span><span aria-hidden="true">→</span></Link>
              <Link className="settings-link danger-link" href={`/dashboard/settings/delete?clinic=${clinic.id}`}><span>{copy.deleteClinic}</span><span aria-hidden="true">→</span></Link>
            </div>
          </section>
        ) : null}

        <section className="settings-card">
          <div className="settings-card-heading">
            <span className="settings-card-icon" aria-hidden="true">●</span>
            <div>
              <div className="eyebrow">{t.account}</div>
              <h2>{t.signedInAs}</h2>
              <p className="account-email" dir="ltr">{userData.user.phone ?? copy.phonePending}</p>
            </div>
          </div>
          <p className="field-help">{copy.accountHelp}</p>
          <PhoneNumberManager locale={locale} currentPhone={userData.user.phone ?? null} />
          <Link className="settings-link" href="/dashboard/settings/account"><span>{copy.accountDeletion}</span><span aria-hidden="true">→</span></Link>
          <details className="settings-disclosure">
            <summary>{copy.quickSignIn}</summary>
            <p className="field-help">{copy.quickSignInHelp}</p>
            <PasskeyManager locale={locale} />
          </details>
          <div className="settings-account-signout">
            <p className="field-help">{copy.signOutHelp}</p>
            <form action={signOut}><SubmitButton className="button button-ghost settings-signout" pendingLabel={t.saving}>{t.signOut}</SubmitButton></form>
          </div>
        </section>
      </div>

      <footer className="settings-utility-footer" aria-label={copy.support}>
        <Link href="/support">Support</Link><span>·</span><Link href="/privacy">Privacy</Link><span>·</span><Link href="/terms">Terms</Link>
      </footer>

      <style>{`
        .settings-readonly-clinic{display:grid;gap:5px;border-radius:12px;padding:12px 14px;background:var(--surface-soft)}.settings-readonly-clinic span,.settings-readonly-clinic small{color:var(--muted);font-size:10px;font-weight:720}.settings-readonly-clinic strong{font-size:17px}.settings-page.is-reception .settings-grid{grid-auto-flow:row dense}.settings-page.is-reception .settings-card{min-height:0}.settings-link-list{display:grid;gap:8px}.settings-disclosure{border-top:1px solid var(--line);padding-top:10px}.settings-disclosure>summary{min-height:42px;display:flex;align-items:center;color:var(--ink-soft);font-size:12px;font-weight:800;cursor:pointer}.settings-utility-footer{display:flex;justify-content:center;gap:9px;padding:24px 0 110px;color:var(--muted);font-size:11px}.settings-utility-footer a{color:inherit}.doctor-settings-row.is-archived{display:flex;align-items:center;justify-content:space-between;gap:12px}
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
