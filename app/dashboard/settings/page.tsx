import Link from "next/link";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/appointments";
import { localizeDigits } from "@/lib/i18n/format";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { uiText, type UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/app/components/submit-button";
import { ConfirmSubmitButton } from "../staff/confirm-submit-button";
import { DoctorWorkflowCard } from "../doctor-workflow-card";
import { SettingsDraftReset } from "../settings-draft-reset";
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

const settingsResultCopy: Record<UiLocale, { errors: Record<string, string>; notices: Record<string, string> }> = {
  en: {
    errors: {
      manager_required: "Clinic administration is required to change this setting.",
      language_invalid: "Choose a supported interface language.",
      clinic_invalid: "Check the clinic name and try again.",
      doctor_invalid: "Check the doctor details and try again.",
      doctor_has_receptionist: "This doctor still has a receptionist assigned. Reassign or remove that receptionist before removing the doctor.",
      save_failed: "That setting could not be saved. Refresh and try again.",
      interval_invalid: "Choose a supported appointment interval.",
      reminders_invalid: "Check the reminder timing and language, then try again.",
      approval_required: "Clinic messaging approval is required before reminders can be enabled.",
    },
    notices: {
      language_saved: "Interface language updated.",
      clinic_saved: "Clinic details updated.",
      doctor_saved: "Doctor settings updated.",
      doctor_archived: "Doctor removed from new appointments. Existing appointment history is preserved.",
      doctor_restored: "Doctor restored.",
    },
  },
  ku: {
    errors: {
      manager_required: "بۆ گۆڕینی ئەم ڕێکخستنە دەسەڵاتی بەڕێوەبردنی کلینیک پێویستە.",
      language_invalid: "زمانێکی پشتگیریکراوی ڕووکار هەڵبژێرە.",
      clinic_invalid: "ناوی کلینیک بپشکنە و دووبارە هەوڵ بدەوە.",
      doctor_invalid: "زانیاری پزیشک بپشکنە و دووبارە هەوڵ بدەوە.",
      doctor_has_receptionist: "هێشتا ستافی ڕیسێپشن بەو پزیشکەوە بەستراوەتەوە. پێش لابردنی پزیشکەکە، ڕیسێپشنەکە بگوازەرەوە بۆ پزیشکێکی تر یان دەسەڵاتەکەی لاببە.",
      save_failed: "ئەم ڕێکخستنە پاشەکەوت نەکرا. پەڕەکە نوێ بکەرەوە و دووبارە هەوڵ بدەوە.",
      interval_invalid: "ماوەیەکی پشتگیریکراوی وادە هەڵبژێرە.",
      reminders_invalid: "کات و زمانی بیرخستنەوە بپشکنە و دووبارە هەوڵ بدەوە.",
      approval_required: "پێش چالاککردنی بیرخستنەوەکان پەسەندکردنی پەیامەکانی کلینیک پێویستە.",
    },
    notices: {
      language_saved: "زمانی ڕووکار نوێکرایەوە.",
      clinic_saved: "زانیاری کلینیک نوێکرایەوە.",
      doctor_saved: "ڕێکخستنەکانی پزیشک نوێکرانەوە.",
      doctor_archived: "پزیشک لە وادە نوێکان لابرا. مێژووی وادەکانی پێشوو پارێزراوە.",
      doctor_restored: "پزیشک گەڕێندرایەوە.",
    },
  },
  bd: {
    errors: {
      manager_required: "بۆ گوهارتنا ڤێ ڕێکخستنێ دەستهەلاتا بەڕێڤەبرنا کلینیکێ پێدڤییە.",
      language_invalid: "زمانەکێ پشتگیری‌کری یێ ڕووکارێ هەلبژێرە.",
      clinic_invalid: "ناڤێ کلینیکێ بپشکنە و جارەکا دی هەول بدە.",
      doctor_invalid: "زانیاریێن دکتۆری بپشکنە و جارەکا دی هەول بدە.",
      doctor_has_receptionist: "هێشتا ستافەکێ ڕیسێپشنێ ب ڤی دکتۆری ڤە گرێدایە. بەری لابرنا دکتۆری، ڕیسێپشنێ بگوهێزە بۆ دکتۆرەکێ دی یان دەستهەلاتا وی لاببە.",
      save_failed: "ئەڤ ڕێکخستنە نەهاتە پاراستن. پەرەیێ نوێ بکە و جارەکا دی هەول بدە.",
      interval_invalid: "ماوەیەکا پشتگیری‌کری یا وادەیان هەلبژێرە.",
      reminders_invalid: "دەم و زمانێ بیرخستنەوەیێ بپشکنە و جارەکا دی هەول بدە.",
      approval_required: "بەری چالاککرنا بیرخستنەوەیان پەسەندکرنا پەیامێن کلینیکێ پێدڤییە.",
    },
    notices: {
      language_saved: "زمانێ ڕووکارێ هاتە نوێکرن.",
      clinic_saved: "زانیاریێن کلینیکێ هاتنە نوێکرن.",
      doctor_saved: "ڕێکخستنێن دکتۆری هاتنە نوێکرن.",
      doctor_archived: "دکتۆر ژ وادەیێن نوو هاتە لابرن. مێژوویا وادەیێن پێشوو پاراستییە.",
      doctor_restored: "دکتۆر هاتە ڤەگەراندن.",
    },
  },
  ar: {
    errors: {
      manager_required: "تحتاج صلاحية إدارة العيادة لتغيير هذا الإعداد.",
      language_invalid: "اختر لغة واجهة مدعومة.",
      clinic_invalid: "راجع اسم العيادة وحاول مرة ثانية.",
      doctor_invalid: "راجع معلومات الطبيب وحاول مرة ثانية.",
      doctor_has_receptionist: "ما زال موظف استقبال مرتبطاً بهذا الطبيب. أعد تعيين موظف الاستقبال أو أزل صلاحية وصوله قبل إزالة الطبيب.",
      save_failed: "تعذر حفظ هذا الإعداد. حدّث الصفحة وحاول مرة ثانية.",
      interval_invalid: "اختر مدة مدعومة بين المواعيد.",
      reminders_invalid: "راجع توقيت التذكير ولغته وحاول مرة ثانية.",
      approval_required: "يلزم اعتماد رسائل العيادة قبل تفعيل التذكيرات.",
    },
    notices: {
      language_saved: "تم تحديث لغة الواجهة.",
      clinic_saved: "تم تحديث بيانات العيادة.",
      doctor_saved: "تم تحديث إعدادات الطبيب.",
      doctor_archived: "تمت إزالة الطبيب من المواعيد الجديدة. تم الاحتفاظ بسجل المواعيد السابقة.",
      doctor_restored: "تمت إعادة الطبيب.",
    },
  },
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
  publicPresence: string;
  publicPresenceHelp: string;
  exportReadable: string;
  exportReadableHelp: string;
  exportCsv: string;
  exportCsvHelp: string;
  exportJson: string;
  exportJsonHelp: string;
  deleteClinic: string;
  accountHelp: string;
  accountDeletion: string;
  quickSignIn: string;
  quickSignInHelp: string;
  signOutHelp: string;
  readOnlyClinic: string;
  phonePending: string;
  support: string;
  archiveDoctorConfirm: string;
  loadFailed: string;
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
    publicPresence: "Public profile",
    publicPresenceHelp: "Choose what patients may see in Atlas discovery. Nothing is published automatically.",
    exportReadable: "Readable clinic report",
    exportReadableHelp: "Open a clean report you can read, print, or save as PDF. Contains patient details — keep it private.",
    exportCsv: "Appointments spreadsheet (CSV)",
    exportCsvHelp: "A simple appointments table for Excel, Numbers, or another spreadsheet app.",
    exportJson: "Technical backup (JSON)",
    exportJsonHelp: "Machine-readable backup for recovery or migration. Keep it securely.",
    deleteClinic: "Delete this clinic",
    accountHelp: "Your verified phone is your Atlas identity.",
    accountDeletion: "Account & deletion",
    quickSignIn: "Faster sign-in on this device",
    quickSignInHelp: "Optional. Add a passkey only if you want a quicker trusted-device shortcut.",
    signOutHelp: "Sign out only when you want this device to require sign-in again.",
    readOnlyClinic: "Clinic administration manages the clinic name.",
    phonePending: "Phone not verified yet",
    support: "Help & legal",
    archiveDoctorConfirm: "Remove {doctor} from new scheduling? Existing appointment history will stay preserved.",
    loadFailed: "The clinic settings could not load. Go back to the schedule and try again.",
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
    publicPresence: "پڕۆفایلی گشتی",
    publicPresenceHelp: "دیاری بکە نەخۆش چی لە Atlas ببینێت. هیچ شتێک بەخۆکار بڵاوناکرێتەوە.",
    exportReadable: "ڕاپۆرتی خوێندنەوەی کلینیک",
    exportReadableHelp: "ڕاپۆرتێکی پاک بکەرەوە بۆ خوێندنەوە، چاپکردن یان هەڵگرتن وەک PDF. زانیاری نەخۆش تێدایە — بە نهێنی هەڵیبگرە.",
    exportCsv: "خشتەی وادەکان (CSV)",
    exportCsvHelp: "خشتەیەکی سادەی وادەکان بۆ Excel، Numbers یان بەرنامەی خشتەسازی.",
    exportJson: "پاڵپشتی تەکنیکی (JSON)",
    exportJsonHelp: "پاڵپشتی بۆ گەڕاندنەوە یان گواستنەوە. بە پارێزراوی هەڵیبگرە.",
    deleteClinic: "سڕینەوەی ئەم کلینیکە",
    accountHelp: "ژمارەی پشتڕاستکراوی مۆبایل ناسنامەی Atlas ـەکەتە.",
    accountDeletion: "هەژمار و سڕینەوە",
    quickSignIn: "چوونەژوورەوەی خێراتر لەم ئامێرە",
    quickSignInHelp: "ئارەزوومەندانەیە. تەنها ئەگەر ڕێگایەکی خێراتر لە ئامێری متمانەپێکراو دەوێت Passkey زیاد بکە.",
    signOutHelp: "تەنها کاتێک بچۆ دەرەوە کە دەتەوێت ئەم ئامێرە دووبارە چوونەژوورەوە بخوازێت.",
    readOnlyClinic: "بەڕێوەبەری کلینیک ناوی کلینیک بەڕێوە دەبات.",
    phonePending: "ژمارەی مۆبایل هێشتا پشتڕاست نەکراوەتەوە",
    support: "یارمەتی و یاسایی",
    archiveDoctorConfirm: "{doctor} لە وادە نوێکان لاببرێت؟ مێژووی وادەکانی پێشوو پارێزراو دەمێنێتەوە.",
    loadFailed: "ڕێکخستنەکانی کلینیک بار نەبوون. بگەڕێوە بۆ خشتەی وادەکان و دووبارە هەوڵ بدەوە.",
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
    publicPresence: "پڕۆفایلا گشتی",
    publicPresenceHelp: "دیار بکە نەخۆش چ د Atlas دا ببینیت. هیچ تشت ب خۆکار ناهێتە بڵاوکرن.",
    exportReadable: "ڕاپۆرتا کلینیکێ یا خواندنێ",
    exportReadableHelp: "ڕاپۆرتەکا پاک بۆ خواندن، چاپکرن یان هەلگرتن وەک PDF. زانیاریێن نەخۆشان تێدانە — ب نهێنی هەلگرە.",
    exportCsv: "خشتەیا وادەیان (CSV)",
    exportCsvHelp: "خشتەیەکا سادە یا وادەیان بۆ Excel، Numbers یان بەرنامەیێن خشتەسازی.",
    exportJson: "پشتگیریا تەکنیکی (JSON)",
    exportJsonHelp: "پشتگیری بۆ ڤەگەڕاندن یان گوهۆڕین. ب پاراستی هەلگرە.",
    deleteClinic: "ژێبرنا ڤێ کلینیکێ",
    accountHelp: "ژمارا پشتڕاستکری یا موبایلێ ناسناما Atlas یا تەیە.",
    accountDeletion: "هەژمار و ژێبرن",
    quickSignIn: "چوونەژوورا خێراتر ل ڤی ئامێری",
    quickSignInHelp: "ئارەزوومەندانەیە. تەنێ ئەگەر ڕێکا خێراتر ل ئامێرێ متمانەپێکری دخوازیت Passkey زێدە بکە.",
    signOutHelp: "تەنێ دەمێ تو دخوازیت ئەڤ ئامێرە دووبارە چوونەژوور بخوازیت بچۆ دەرڤە.",
    readOnlyClinic: "بەڕێڤەبرنا کلینیکێ ناڤێ کلینیکێ بەڕێڤە دبەت.",
    phonePending: "ژمارا موبایلێ هێشتا نەهاتییە پشتڕاستکرن",
    support: "هاریکاری و یاسایی",
    archiveDoctorConfirm: "{doctor} ژ وادەیێن نوو بهێتە لابرن؟ مێژوویا وادەیێن پێشوو دێ پاراستی بمینیت.",
    loadFailed: "ڕێکخستنێن کلینیکێ بار نەبوون. ڤەگەڕە خشتەیا وادەیان و جارەکا دی هەول بدە.",
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
    publicPresence: "الملف العام",
    publicPresenceHelp: "اختر ما الذي يراه المرضى في اكتشاف Atlas. لا يتم نشر أي شيء تلقائياً.",
    exportReadable: "تقرير عيادة سهل القراءة",
    exportReadableHelp: "افتح تقريراً مرتباً للقراءة أو الطباعة أو الحفظ كـ PDF. يحتوي بيانات مرضى — احفظه بخصوصية.",
    exportCsv: "جدول المواعيد (CSV)",
    exportCsvHelp: "جدول بسيط للمواعيد لفتحه في Excel أو Numbers أو أي برنامج جداول.",
    exportJson: "نسخة احتياطية تقنية (JSON)",
    exportJsonHelp: "نسخة قابلة للمعالجة للاسترجاع أو النقل. احفظها بشكل آمن.",
    deleteClinic: "حذف هذه العيادة",
    accountHelp: "رقم الهاتف الموثق هو هويتك في Atlas.",
    accountDeletion: "الحساب والحذف",
    quickSignIn: "دخول أسرع على هذا الجهاز",
    quickSignInHelp: "اختياري. أضف Passkey فقط إذا تريد اختصاراً أسرع على جهاز موثوق.",
    signOutHelp: "سجّل الخروج فقط عندما تريد أن يطلب هذا الجهاز تسجيل الدخول من جديد.",
    readOnlyClinic: "تدير إدارة العيادة اسم العيادة.",
    phonePending: "رقم الهاتف غير موثق بعد",
    support: "المساعدة والقانوني",
    archiveDoctorConfirm: "إزالة {doctor} من المواعيد الجديدة؟ سيبقى سجل المواعيد السابقة محفوظاً.",
    loadFailed: "تعذر تحميل إعدادات العيادة. ارجع إلى جدول المواعيد وحاول مرة ثانية.",
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

  if (doctorsError) return <SettingsUnavailable label={t.settingsTitle} back={t.backToSchedule} error={copy.loadFailed} clinicId={clinic.id} />;

  const canManage = clinic.owner_id === userData.user.id
    || membership?.role === "owner"
    || membership?.role === "manager";
  const isOwner = clinic.owner_id === userData.user.id || membership?.role === "owner";
  const activeDoctors = (doctors ?? []).filter((doctor) => doctor.active);
  const archivedDoctors = (doctors ?? []).filter((doctor) => !doctor.active);
  const resultCopy = settingsResultCopy[locale];
  const errorMessage = params.error ? resultCopy.errors[params.error] : null;
  const noticeMessage = params.notice ? resultCopy.notices[params.notice] : null;

  return (
    <main className={`settings-page shell ${canManage ? "is-administration" : "is-reception"}`}>
      <SettingsDraftReset locale={locale} />
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
                <SubmitButton pendingLabel={t.saving} lockForm>{t.saveName}</SubmitButton>
              </div>
            </form>
          ) : (
            <div className="settings-readonly-clinic"><span>{t.clinicName}</span><strong>{clinic.name}</strong><small>{copy.readOnlyClinic}</small></div>
          )}
          {canManage ? (
            <Link className="settings-link settings-public-profile-link" href={`/dashboard/settings/public-profile?clinic=${clinic.id}`}>
              <span className="settings-export-copy"><strong>{copy.publicPresence}</strong><small>{copy.publicPresenceHelp}</small></span>
              <span aria-hidden="true">→</span>
            </Link>
          ) : null}
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
              <SubmitButton pendingLabel={t.saving} lockForm>{t.addDoctor}</SubmitButton>
            </form>

            <div className="doctor-settings-list">
              {activeDoctors.map((doctor, index) => (
                <article className="doctor-settings-row" key={doctor.id}>
                  <form action={updateDoctor} className="doctor-name-form">
                    <input type="hidden" name="clinic_id" value={clinic.id} />
                    <input type="hidden" name="doctor_id" value={doctor.id} />
                    <label className="sr-only" htmlFor={`doctor-${doctor.id}`}>{t.doctorName}</label>
                    <input id={`doctor-${doctor.id}`} name="doctor_name" defaultValue={doctor.name} minLength={2} maxLength={120} required />
                    <SubmitButton pendingLabel={t.saving} lockForm>{t.saveName}</SubmitButton>
                  </form>
                  <div className="doctor-row-meta">
                    <span>{t.doctorAvailable}</span>
                    <div className="compact-actions">
                      {index > 0 ? <form action={moveDoctor.bind(null, clinic.id, doctor.id, "up")}><SubmitButton className="" pendingLabel={t.saving}>{t.moveUp}</SubmitButton></form> : null}
                      {index < activeDoctors.length - 1 ? <form action={moveDoctor.bind(null, clinic.id, doctor.id, "down")}><SubmitButton className="" pendingLabel={t.saving}>{t.moveDown}</SubmitButton></form> : null}
                      <form action={setDoctorActive.bind(null, clinic.id, doctor.id, false)}>
                        <ConfirmSubmitButton
                          className="danger-link"
                          pendingLabel={t.saving}
                          confirmMessage={copy.archiveDoctorConfirm.replace("{doctor}", doctor.name)}
                        >
                          {t.archive}
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {archivedDoctors.length ? (
              <details className="settings-disclosure">
                <summary>{copy.removedDoctors} ({localizeDigits(archivedDoctors.length, locale)})</summary>
                <div className="doctor-settings-list">
                  {archivedDoctors.map((doctor) => (
                    <article className="doctor-settings-row is-archived" key={doctor.id}>
                      <strong>{doctor.name}</strong>
                      <form action={setDoctorActive.bind(null, clinic.id, doctor.id, true)}><SubmitButton className="button button-ghost button-small" pendingLabel={t.saving}>{t.restore}</SubmitButton></form>
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
              <div className="settings-export-group">
                <form className="settings-export-form" action="/api/clinic-export" method="post" target="_blank">
                  <input type="hidden" name="clinic_id" value={clinic.id} />
                  <input type="hidden" name="format" value="html" />
                  <button className="settings-link settings-export-button" type="submit">
                    <span className="settings-export-copy"><strong>{copy.exportReadable}</strong><small>{copy.exportReadableHelp}</small></span>
                    <span aria-hidden="true">↗</span>
                  </button>
                </form>
                <form className="settings-export-form" action="/api/clinic-export" method="post">
                  <input type="hidden" name="clinic_id" value={clinic.id} />
                  <input type="hidden" name="format" value="csv" />
                  <button className="settings-link settings-export-button" type="submit">
                    <span className="settings-export-copy"><strong>{copy.exportCsv}</strong><small>{copy.exportCsvHelp}</small></span>
                    <span aria-hidden="true">↓</span>
                  </button>
                </form>
                <form className="settings-export-form" action="/api/clinic-export" method="post">
                  <input type="hidden" name="clinic_id" value={clinic.id} />
                  <input type="hidden" name="format" value="json" />
                  <button className="settings-link settings-export-button" type="submit">
                    <span className="settings-export-copy"><strong>{copy.exportJson}</strong><small>{copy.exportJsonHelp}</small></span>
                    <span aria-hidden="true">↓</span>
                  </button>
                </form>
              </div>
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
        .settings-readonly-clinic{display:grid;gap:5px;border-radius:12px;padding:12px 14px;background:var(--surface-soft)}.settings-public-profile-link{margin-top:10px}.settings-readonly-clinic span,.settings-readonly-clinic small{color:var(--muted);font-size:10px;font-weight:720}.settings-readonly-clinic strong{font-size:17px}.settings-page.is-reception .settings-grid{grid-auto-flow:row dense}.settings-page.is-reception .settings-card{min-height:0}.settings-link-list{display:grid;gap:8px}.settings-export-group{display:grid;gap:6px}.settings-export-form{margin:0}.settings-export-button{width:100%;font:inherit;text-align:inherit;cursor:pointer}.settings-export-copy{display:grid;gap:2px}.settings-export-copy strong{font:inherit}.settings-export-copy small{max-width:520px;color:var(--muted);font-size:10px;font-weight:650;line-height:1.35}.settings-disclosure{border-top:1px solid var(--line);padding-top:10px}.settings-disclosure>summary{min-height:42px;display:flex;align-items:center;color:var(--ink-soft);font-size:12px;font-weight:800;cursor:pointer}.settings-utility-footer{display:flex;justify-content:center;gap:9px;padding:24px 0 110px;color:var(--muted);font-size:11px}.settings-utility-footer a{color:inherit}.doctor-settings-row.is-archived{display:flex;align-items:center;justify-content:space-between;gap:12px}
      `}</style>
    </main>
  );
}

function SettingsUnavailable({ label, back, error, clinicId }: { label: string; back: string; error: string; clinicId: string }) {
  return (
    <main className="center-page">
      <section className="auth-card">
        <div className="brand">Atlas</div>
        <h1>{label}</h1>
        <p className="notice notice-error" role="alert">{error}</p>
        <Link className="button" href={`/dashboard?clinic=${clinicId}`}>{back}</Link>
      </section>
    </main>
  );
}
