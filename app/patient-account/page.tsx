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
  sessionExpired: string;
  manageFailed: string;
  rateLimited: string;
  statuses: Record<string, string>;
}> = {
  en: {
    language: "Language",
    eyebrow: "Patient account",
    title: "My appointments",
    intro: "Your Atlas patient account keeps verified self-booked appointments together without giving access to clinic workspaces.",
    signInTitle: "Sign in to your patient account",
    hello: "Hello",
    upcoming: "Your appointments",
    noAppointments: "No linked appointments yet.",
    noAppointmentsHelp: "Appointments you self-book with this verified number will appear here.",
    findCare: "Find care",
    manage: "Manage appointment",
    signOut: "Sign out",
    sessionExpired: "Your patient session ended. Verify your mobile number again.",
    manageFailed: "Atlas could not open that appointment. Try again.",
    rateLimited: "Too many attempts. Wait a little and try again.",
    statuses: { pending: "Pending", confirmed: "Confirmed", cancelled: "Cancelled", completed: "Completed", no_show: "No-show" },
  },
  ku: {
    language: "زمان",
    eyebrow: "هەژماری نەخۆش",
    title: "مەوعیدەکانم",
    intro: "هەژماری نەخۆشی Atlas مەوعیدە پشتڕاستکراوەکانی خۆت لە یەک شوێن کۆدەکاتەوە، بەبێ ئەوەی دەستگەیشتن بە شوێنی کاری کلینیک بدات.",
    signInTitle: "بچۆ ژوورەوە بۆ هەژماری نەخۆش",
    hello: "سڵاو",
    upcoming: "مەوعیدەکانی تۆ",
    noAppointments: "هێشتا هیچ مەوعیدێکی بەستراو نییە.",
    noAppointmentsHelp: "ئەو مەوعیدانەی خۆت بە هەمان ژمارەی پشتڕاستکراو دایدەنێیت لێرە دەردەکەون.",
    findCare: "چارەسەر بدۆزەرەوە",
    manage: "بەڕێوەبردنی مەوعید",
    signOut: "دەرچوون",
    sessionExpired: "دانیشتنی نەخۆش کۆتایی هات. ژمارەی مۆبایل دووبارە پشتڕاست بکەرەوە.",
    manageFailed: "Atlas نەیتوانی ئەم مەوعیدە بکاتەوە. دووبارە هەوڵبدەوە.",
    rateLimited: "هەوڵەکان زۆر بوون. کەمێک چاوەڕێ بکە و دووبارە هەوڵبدەوە.",
    statuses: { pending: "چاوەڕوان", confirmed: "پشتڕاستکراو", cancelled: "هەڵوەشاوە", completed: "تەواوبوو", no_show: "نەهات" },
  },
  bd: {
    language: "زمان",
    eyebrow: "هەژمارا نەخۆشی",
    title: "وادەیێن من",
    intro: "هەژمارا نەخۆشی یا Atlas وادەیێن پشتڕاستکری یێن خۆ ل جهەکێ کۆم دکەت، بێ دەستگەهشتنێ ب شوێنێ کارێ کلینیکێ.",
    signInTitle: "بچۆ ژوور بۆ هەژمارا نەخۆشی",
    hello: "سلاڤ",
    upcoming: "وادەیێن تە",
    noAppointments: "هێشتا چ وادەیەکا گرێدای نینە.",
    noAppointmentsHelp: "وادەیێن کو تو ب هەمان ژمارا پشتڕاستکری خۆ ددانی ل ڤێرێ دیار دبن.",
    findCare: "دکتۆر بدیتەوە",
    manage: "وادەیێ بەڕێڤە ببە",
    signOut: "دەرکەڤە",
    sessionExpired: "دانیشتنا نەخۆشی دوماهی هات. ژمارا موبایلێ جارەکا دی پشتڕاست بکە.",
    manageFailed: "Atlas نەشیا ڤێ وادەیێ بکەتەڤە. جارەکا دی هەول بدە.",
    rateLimited: "هەول زۆر بوون. کەمەک چاوەرێ بکە و جارەکا دی هەول بدە.",
    statuses: { pending: "چاڤەڕێ", confirmed: "پشتڕاستکری", cancelled: "هەلوەشاندی", completed: "تەمامبووی", no_show: "نەهات" },
  },
  ar: {
    language: "اللغة",
    eyebrow: "حساب المريض",
    title: "مواعيدي",
    intro: "حساب المريض في Atlas يجمع مواعيدك المحجوزة بنفسك والمرتبطة برقمك الموثق، بدون أي وصول لمساحة عمل العيادة.",
    signInTitle: "ادخل إلى حساب المريض",
    hello: "أهلاً",
    upcoming: "مواعيدك",
    noAppointments: "ماكو مواعيد مرتبطة بعد.",
    noAppointmentsHelp: "المواعيد التي تحجزها بنفسك بنفس الرقم الموثق راح تظهر هنا.",
    findCare: "ابحث عن رعاية",
    manage: "إدارة الموعد",
    signOut: "تسجيل الخروج",
    sessionExpired: "انتهت جلسة المريض. وثّق رقم الموبايل مرة ثانية.",
    manageFailed: "تعذر على Atlas فتح هذا الموعد. حاول مرة ثانية.",
    rateLimited: "المحاولات كثيرة. انتظر قليلاً وحاول مرة ثانية.",
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

  let appointments: AccountAppointment[] = [];
  if (admin && session) {
    const { data, error } = await admin.rpc("list_patient_account_appointments_service", {
      p_user_id: session.user_id,
    });
    if (!error && Array.isArray(data)) appointments = data as AccountAppointment[];
  }

  const readiness = session ? null : await getAtlasAuthReadiness();
  const signInReady = Boolean(
    readiness?.reachable
    && readiness.supabasePhoneEnabled
    && !readiness.signupDisabled
    && readiness.openPhoneSignupEnabled,
  );

  const notice = query.notice === "session_expired" ? t.sessionExpired : null;
  const error = query.error === "rate_limited"
    ? t.rateLimited
    : query.error === "manage_failed"
      ? t.manageFailed
      : null;

  return (
    <main className="center-page patient-account-page">
      <section className="auth-card patient-account-card" lang={meta.lang} dir={meta.dir}>
        <Link className="app-brand" href="/">
          <span className="app-brand-mark" aria-hidden="true">A</span>
          <span className="app-brand-word">Atlas</span>
        </Link>

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
              <Link className="button button-ghost" href={`/care?lang=${locale}`}>{t.findCare}</Link>
              <form action={`/patient-account/api/sign-out?lang=${locale}`} method="post">
                <button className="button button-ghost" type="submit">{t.signOut}</button>
              </form>
            </div>

            <section className="patient-account-appointments" aria-label={t.upcoming}>
              <h2>{t.upcoming}</h2>
              {appointments.length ? (
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
                  <Link className="button" href={`/care?lang=${locale}`}>{t.findCare}</Link>
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            <h2 className="patient-account-signin-title">{t.signInTitle}</h2>
            <PatientAccountLoginForm
              locale={locale}
              ready={signInReady}
              whatsappOtpEnabled={readiness?.whatsappOtpEnabled === true}
            />
          </>
        )}

        <style>{`
          .patient-account-card{width:min(100%,720px);padding:clamp(24px,5vw,38px)}
          .patient-account-languages{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:20px 0}
          .patient-account-languages a{border:1px solid var(--line);border-radius:999px;padding:8px 6px;color:var(--muted);font-size:11px;font-weight:780;text-align:center;text-decoration:none}
          .patient-account-languages a[aria-current="page"]{border-color:#b9dfd1;background:#effaf6;color:var(--accent)}
          .patient-account-intro{margin-bottom:20px;line-height:1.6}
          .patient-account-hello{font-size:16px}
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
    </main>
  );
}
