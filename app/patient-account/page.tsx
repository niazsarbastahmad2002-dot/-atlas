import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { PatientAccountLoginForm } from "./login-form";
import { getAtlasAuthReadiness } from "@/lib/auth-readiness";
import type { UiLocale } from "@/lib/i18n/ui";
import { isUiLocale } from "@/lib/i18n/ui";
import { getUiLocale } from "@/lib/i18n/ui-server";
import {
  patientAccountCookieName,
  resolvePatientAccountSession,
} from "@/lib/patient-account-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { AtlasPatientNav } from "@/app/care/patient-nav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My appointments — Atlas",
  robots: { index: false, follow: false },
};

type PatientAccountPageProps = {
  searchParams: Promise<{ lang?: string; error?: string; notice?: string }>;
};

type AccountAppointment = {
  appointment_id: string;
  clinic_name: string;
  doctor_name: string;
  doctor_specialty: string | null;
  appointment_at: string;
  appointment_status: string;
  reminder_language: string;
};

const copy: Record<UiLocale, {
  language: string;
  eyebrow: string;
  title: string;
  intro: string;
  signInTitle: string;
  hello: string;
  upcoming: string;
  noAppointments: string;
  noAppointmentsHelp: string;
  findCare: string;
  manage: string;
  signOut: string;
  profileTitle: string;
  profileHelp: string;
  nameLabel: string;
  nameHint: string;
  preferredLanguage: string;
  saveProfile: string;
  profileSaved: string;
  profileInvalid: string;
  profileFailed: string;
  sessionExpired: string;
  manageFailed: string;
  rateLimited: string;
  loadFailed: string;
  statuses: Record<string, string>;
}> = {
  en: {
    language: "Language",
    eyebrow: "Patient account",
    title: "My appointments",
    intro: "See your appointments and keep your booking details together in one private place.",
    signInTitle: "Sign in to see your appointments",
    hello: "Hello",
    upcoming: "Your appointments",
    noAppointments: "No appointments yet.",
    noAppointmentsHelp: "Appointments you book with Atlas will appear here.",
    findCare: "Find care",
    manage: "Manage appointment",
    signOut: "Sign out",
    profileTitle: "Your profile",
    profileHelp: "Atlas can reuse your name and language when you book. These details stay private.",
    nameLabel: "Name",
    nameHint: "Use the name clinics should see with your appointment.",
    preferredLanguage: "Preferred language",
    saveProfile: "Save profile",
    profileSaved: "Your patient profile was saved.",
    profileInvalid: "Check your name and language, then try again.",
    profileFailed: "Atlas could not save your profile right now. Try again.",
    sessionExpired: "Your patient session ended. Verify your mobile number again.",
    manageFailed: "Atlas could not open that appointment. Try again.",
    rateLimited: "Too many attempts. Wait a little and try again.",
    loadFailed: "Atlas could not load your appointments right now. Try again.",
    statuses: { pending: "Pending", confirmed: "Confirmed", cancelled: "Cancelled", completed: "Completed", no_show: "No-show" },
  },
  ku: {
    language: "زمان",
    eyebrow: "هەژماری نەخۆش",
    title: "مەوعیدەکانم",
    intro: "مەوعیدەکانت ببینە و زانیارییە پێویستەکانت لە یەک شوێنی تایبەتدا بپارێزە.",
    signInTitle: "بچۆ ژوورەوە بۆ بینینی مەوعیدەکانت",
    hello: "سڵاو",
    upcoming: "مەوعیدەکانی تۆ",
    noAppointments: "هێشتا هیچ مەوعیدێکت نییە.",
    noAppointmentsHelp: "ئەو مەوعیدانەی لە Atlas دایدەنێیت لێرە دەردەکەون.",
    findCare: "چارەسەر بدۆزەرەوە",
    manage: "بەڕێوەبردنی مەوعید",
    signOut: "دەرچوون",
    profileTitle: "زانیارییەکانت",
    profileHelp: "Atlas ناو و زمانەکەت کاتێک مەوعید دادەنێیت دووبارە بەکاردەهێنێت. ئەم زانیارییانە تایبەتن.",
    nameLabel: "ناو",
    nameHint: "ئەو ناوە بنووسە کە دەتەوێت کلینیک لەگەڵ مەوعیدەکەت ببینێت.",
    preferredLanguage: "زمانی پەسەندکراو",
    saveProfile: "پاشەکەوتکردن",
    profileSaved: "زانیارییەکانت پاشەکەوت کران.",
    profileInvalid: "ناو و زمانەکەت بپشکنە و دووبارە هەوڵ بدە.",
    profileFailed: "Atlas ئێستا نەیتوانی زانیارییەکانت پاشەکەوت بکات. دووبارە هەوڵ بدە.",
    sessionExpired: "دانیشتنی نەخۆش کۆتایی هات. ژمارەی مۆبایل دووبارە پشتڕاست بکەرەوە.",
    manageFailed: "Atlas نەیتوانی ئەم مەوعیدە بکاتەوە. دووبارە هەوڵبدەوە.",
    rateLimited: "هەوڵەکان زۆر بوون. کەمێک چاوەڕێ بکە و دووبارە هەوڵبدەوە.",
    loadFailed: "Atlas ئێستا نەیتوانی مەوعیدەکانت بار بکات. دووبارە هەوڵبدەوە.",
    statuses: { pending: "چاوەڕوان", confirmed: "پشتڕاستکراو", cancelled: "هەڵوەشاوە", completed: "تەواوبوو", no_show: "نەهات" },
  },
  bd: {
    language: "زمان",
    eyebrow: "هەژمارا نەخۆشی",
    title: "وادەیێن من",
    intro: "وادەیێن خۆ ببینە و زانیارییێن پێدڤی یێن خۆ ل جهەکێ تایبەت بپارێزە.",
    signInTitle: "بچۆ ژوور بۆ دیتنا وادەیێن خۆ",
    hello: "سلاڤ",
    upcoming: "وادەیێن تە",
    noAppointments: "هێشتا چ وادەیەکا تە نینە.",
    noAppointmentsHelp: "وادەیێن کو تو ل Atlas ددانی ل ڤێرێ دیار دبن.",
    findCare: "دکتۆر بدیتەوە",
    manage: "وادەیێ بەڕێڤە ببە",
    signOut: "دەرکەڤە",
    profileTitle: "زانیارییێن تە",
    profileHelp: "Atlas ناڤ و زمانێ تە دەمێ وادەیەکێ ددانی جارەکا دی ب کار دئینیت. ئەڤ زانیارییە تایبەتن.",
    nameLabel: "ناڤ",
    nameHint: "ئەو ناڤە بنڤیسە کو دخوازیت کلینیک دگەل وادەیا تە ببینیت.",
    preferredLanguage: "زمانێ پەسەندکری",
    saveProfile: "پاراستن",
    profileSaved: "زانیارییێن تە هاتنە پاراستن.",
    profileInvalid: "ناڤ و زمانێ خۆ بپشکنە و جارەکا دی هەول بدە.",
    profileFailed: "Atlas نوکە نەشیا زانیارییێن تە بپارێزیت. جارەکا دی هەول بدە.",
    sessionExpired: "دانیشتنا نەخۆشی دوماهی هات. ژمارا موبایلێ جارەکا دی پشتڕاست بکە.",
    manageFailed: "Atlas نەشیا ڤێ وادەیێ بکەتەڤە. جارەکا دی هەول بدە.",
    rateLimited: "هەول زۆر بوون. کەمەک چاوەرێ بکە و جارەکا دی هەول بدە.",
    loadFailed: "Atlas نوکە نەشیا وادەیێن تە بار بکەت. جارەکا دی هەول بدە.",
    statuses: { pending: "چاڤەڕێ", confirmed: "پشتڕاستکری", cancelled: "هەلوەشاندی", completed: "تەمامبووی", no_show: "نەهات" },
  },
  ar: {
    language: "اللغة",
    eyebrow: "حساب المريض",
    title: "مواعيدي",
    intro: "شوف مواعيدك وخلي معلومات الحجز الأساسية بمكان واحد خاص بيك.",
    signInTitle: "سجّل الدخول حتى تشوف مواعيدك",
    hello: "أهلاً",
    upcoming: "مواعيدك",
    noAppointments: "ماكو مواعيد بعد.",
    noAppointmentsHelp: "المواعيد اللي تحجزها عبر Atlas راح تظهر هنا.",
    findCare: "ابحث عن رعاية",
    manage: "إدارة الموعد",
    signOut: "تسجيل الخروج",
    profileTitle: "معلوماتك",
    profileHelp: "Atlas يقدر يعيد استخدام اسمك ولغتك لما تحجز. هالمعلومات تبقى خاصة.",
    nameLabel: "الاسم",
    nameHint: "اكتب الاسم الذي تريد أن تراه العيادة مع موعدك.",
    preferredLanguage: "اللغة المفضلة",
    saveProfile: "حفظ المعلومات",
    profileSaved: "تم حفظ معلوماتك.",
    profileInvalid: "راجع الاسم واللغة وحاول مرة ثانية.",
    profileFailed: "تعذر على Atlas حفظ معلوماتك الآن. حاول مرة ثانية.",
    sessionExpired: "انتهت جلسة المريض. وثّق رقم الموبايل مرة ثانية.",
    manageFailed: "تعذر على Atlas فتح هذا الموعد. حاول مرة ثانية.",
    rateLimited: "المحاولات كثيرة. انتظر قليلاً وحاول مرة ثانية.",
    loadFailed: "تعذر على Atlas تحميل مواعيدك الآن. حاول مرة ثانية.",
    statuses: { pending: "قيد الانتظار", confirmed: "مؤكد", cancelled: "ملغي", completed: "مكتمل", no_show: "لم يحضر" },
  },
};

const languageOptions: Array<{ locale: UiLocale; label: string; lang: string; dir: "ltr" | "rtl" }> = [
  { locale: "ku", label: "سۆرانی", lang: "ckb", dir: "rtl" },
  { locale: "bd", label: "بادینی", lang: "ku", dir: "rtl" },
  { locale: "ar", label: "العربية", lang: "ar", dir: "rtl" },
  { locale: "en", label: "English", lang: "en", dir: "ltr" },
];

function localeMeta(locale: UiLocale) {
  return locale === "en"
    ? { lang: "en", dir: "ltr" as const, dateLocale: "en-IQ" }
    : locale === "ar"
      ? { lang: "ar-IQ", dir: "rtl" as const, dateLocale: "ar-IQ" }
      : { lang: locale === "ku" ? "ckb" : "ku", dir: "rtl" as const, dateLocale: "ckb-IQ" };
}

function appointmentDate(value: string, locale: UiLocale) {
  const meta = localeMeta(locale);
  return new Intl.DateTimeFormat(meta.dateLocale, {
    timeZone: "Asia/Baghdad",
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function PatientAccountPage({ searchParams }: PatientAccountPageProps) {
  const query = await searchParams;
  const fallbackLocale = isUiLocale(query.lang) ? query.lang : await getUiLocale();

  let admin: ReturnType<typeof createAdminClient> | null = null;
  try {
    admin = createAdminClient();
  } catch {
    admin = null;
  }

  const cookieStore = await cookies();
  const rawSession = cookieStore.get(patientAccountCookieName)?.value ?? "";
  const session = admin ? await resolvePatientAccountSession(admin, rawSession) : null;
  const locale = isUiLocale(query.lang)
    ? query.lang
    : isUiLocale(session?.preferred_language)
      ? session.preferred_language
      : fallbackLocale;
  const t = copy[locale];
  const meta = localeMeta(locale);
  const findCareHref = `/api/ui-language?locale=${locale}`;

  let appointments: AccountAppointment[] = [];
  let appointmentsFailed = false;
  if (admin && session) {
    const { data, error } = await admin.rpc("list_patient_account_appointments_service", {
      p_user_id: session.user_id,
    });
    if (error || !Array.isArray(data)) appointmentsFailed = true;
    else appointments = data as AccountAppointment[];
  }

  const readiness = session ? null : await getAtlasAuthReadiness();
  const signInReady = Boolean(
    readiness?.reachable
    && readiness.supabasePhoneEnabled,
  );
  const allowSignup = Boolean(
    readiness?.openPhoneSignupEnabled
    && !readiness.signupDisabled,
  );

  const notice = query.notice === "session_expired"
    ? t.sessionExpired
    : query.notice === "profile_saved"
      ? t.profileSaved
      : null;
  const error = query.error === "rate_limited"
    ? t.rateLimited
    : query.error === "manage_failed"
      ? t.manageFailed
      : query.error === "profile_invalid"
        ? t.profileInvalid
        : query.error === "profile_failed"
          ? t.profileFailed
          : null;

  return (
    <main className="patient-account-page" lang={meta.lang} dir={meta.dir}>
      <AtlasPatientNav
        locale={locale}
        actionLabel={t.findCare}
        actionHref={findCareHref}
      />
      <div className="center-page patient-account-center">
      <section className="auth-card patient-account-card" lang={meta.lang} dir={meta.dir}>
        <nav className="patient-account-languages" aria-label={t.language}>
          {languageOptions.map((option) => (
            <Link
              key={option.locale}
              href={`/patient-account?lang=${option.locale}`}
              lang={option.lang}
              dir={option.dir}
              aria-current={locale === option.locale ? "page" : undefined}
            >
              {option.label}
            </Link>
          ))}
        </nav>

        <div className="eyebrow">{t.eyebrow}</div>
        <h1>{t.title}</h1>
        <p className="quiet patient-account-intro">{t.intro}</p>

        {notice ? <p className="notice" role="status">{notice}</p> : null}
        {error ? <p className="notice notice-error" role="alert">{error}</p> : null}

        {session ? (
          <>
            {session.display_name ? <p className="patient-account-hello">{t.hello}, <strong>{session.display_name}</strong></p> : null}

            <div className="patient-account-toolbar">
              <a className="button button-ghost" href={findCareHref}>{t.findCare}</a>
              <form action={`/patient-account/api/sign-out?lang=${locale}`} method="post">
                <button className="button button-ghost" type="submit">{t.signOut}</button>
              </form>
            </div>

            <section className="patient-account-appointments" aria-label={t.upcoming}>
              <h2>{t.upcoming}</h2>
              {appointmentsFailed ? (
                <p className="notice notice-error" role="alert">{t.loadFailed}</p>
              ) : appointments.length ? (
                <div className="patient-account-list">
                  {appointments.map((appointment) => (
                    <article className="patient-account-appointment" key={appointment.appointment_id}>
                      <div className="patient-account-appointment-main">
                        <span className="patient-account-status">
                          {t.statuses[appointment.appointment_status] ?? appointment.appointment_status}
                        </span>
                        <strong>{appointment.doctor_name}</strong>
                        {appointment.doctor_specialty ? <span>{appointment.doctor_specialty}</span> : null}
                        <span>{appointment.clinic_name}</span>
                        <time dateTime={appointment.appointment_at}>{appointmentDate(appointment.appointment_at, locale)}</time>
                      </div>
                      <form
                        action={`/patient-account/api/appointments/${appointment.appointment_id}/manage?lang=${locale}`}
                        method="post"
                      >
                        <button className="button patient-account-manage" type="submit">{t.manage}</button>
                      </form>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="patient-account-empty">
                  <strong>{t.noAppointments}</strong>
                  <p>{t.noAppointmentsHelp}</p>
                  <a className="button" href={findCareHref}>{t.findCare}</a>
                </div>
              )}
            </section>

            <section className="patient-account-profile" aria-label={t.profileTitle}>
              <h2>{t.profileTitle}</h2>
              <p className="quiet">{t.profileHelp}</p>
              <form
                className="patient-account-profile-form"
                action={`/patient-account/api/profile?lang=${locale}`}
                method="post"
              >
                <input type="hidden" name="return_lang" value={locale} />
                <label>
                  <span>{t.nameLabel}</span>
                  <input
                    name="display_name"
                    type="text"
                    defaultValue={session.display_name ?? ""}
                    minLength={2}
                    maxLength={120}
                    autoComplete="name"
                    required
                  />
                  <small>{t.nameHint}</small>
                </label>
                <label>
                  <span>{t.preferredLanguage}</span>
                  <select
                    name="preferred_language"
                    defaultValue={isUiLocale(session.preferred_language) ? session.preferred_language : locale}
                  >
                    {languageOptions.map((option) => (
                      <option key={option.locale} value={option.locale}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <button className="button" type="submit">{t.saveProfile}</button>
              </form>
            </section>
          </>
        ) : (
          <>
            <h2 className="patient-account-signin-title">{t.signInTitle}</h2>
            <PatientAccountLoginForm
              locale={locale}
              ready={signInReady}
              allowSignup={allowSignup}
              whatsappOtpEnabled={readiness?.whatsappOtpEnabled === true}
            />
          </>
        )}

        <style>{`
          .patient-account-page{min-height:100dvh}.patient-account-center{min-height:calc(100dvh - 72px);padding-top:20px;padding-bottom:40px}
          .patient-account-card{width:min(100%,720px);padding:clamp(24px,5vw,38px)}
          .patient-account-languages{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:20px 0}
          .patient-account-languages a{border:1px solid var(--line);border-radius:999px;padding:8px 6px;color:var(--muted);font-size:11px;font-weight:780;text-align:center;text-decoration:none}
          .patient-account-languages a[aria-current="page"]{border-color:#b9dfd1;background:#effaf6;color:var(--accent)}
          .patient-account-intro{margin-bottom:20px;line-height:1.6}
          .patient-account-hello{font-size:16px}
          .patient-account-profile{display:grid;gap:10px;margin:18px 0 22px;border:1px solid var(--line);border-radius:18px;padding:18px;background:var(--surface-soft)}
          .patient-account-profile h2{margin:0;font-size:20px}.patient-account-profile>p{margin:0;line-height:1.55}
          .patient-account-profile-form{display:grid;gap:14px;margin-top:4px}.patient-account-profile-form label{display:grid;gap:6px}.patient-account-profile-form label>span{font-size:12px;font-weight:800}.patient-account-profile-form small{color:var(--muted);font-size:10.5px;line-height:1.5}.patient-account-profile-form input,.patient-account-profile-form select{width:100%;min-height:46px}.patient-account-profile-form button{min-height:48px}
          .patient-account-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0 24px}.patient-account-toolbar form{margin:0}
          .patient-account-appointments h2,.patient-account-signin-title{margin:18px 0 12px;font-size:20px}
          .patient-account-list{display:grid;gap:12px}
          .patient-account-appointment{display:grid;grid-template-columns:1fr auto;gap:16px;align-items:center;border:1px solid var(--line);border-radius:18px;padding:18px;background:var(--surface-soft)}
          .patient-account-appointment-main{display:grid;gap:5px;min-width:0}
          .patient-account-appointment-main strong{font-size:19px}.patient-account-appointment-main span,.patient-account-appointment-main time{font-size:12px;color:var(--muted)}
          .patient-account-status{width:fit-content!important;border-radius:999px;padding:4px 8px!important;background:#effaf6;color:var(--accent)!important;font-size:10px!important;font-weight:850}
          .patient-account-manage{min-height:44px}
          .patient-account-empty,.patient-account-not-ready{display:grid;gap:10px;border:1px solid var(--line);border-radius:18px;padding:18px;background:var(--surface-soft)}
          .patient-account-empty p,.patient-account-not-ready p{margin:0;line-height:1.55}
          .patient-account-login-card,.patient-account-login-form{display:grid;gap:14px}.patient-account-login-form label{display:grid;gap:6px}.patient-account-login-form label>span{font-size:12px;font-weight:800}.patient-account-login-form label small{color:var(--muted);font-size:10.5px;line-height:1.5}
          .patient-account-code-heading{display:grid;gap:6px}.patient-account-code-heading p{margin:0;color:var(--muted);font-size:12px}.patient-account-login-actions{display:flex;gap:8px;flex-wrap:wrap}
          @media(max-width:620px){.patient-account-appointment{grid-template-columns:1fr}.patient-account-manage{width:100%}}
        `}</style>
      </section>
      </div>
    </main>
  );
}
