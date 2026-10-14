import type { Metadata } from "next";
import Link from "next/link";
import { AtlasPatientNav } from "@/app/care/patient-nav";
import { resolvePatientLocale } from "@/app/care/patient-locale";
import { PatientAccountLoginForm } from "@/app/patient-account/login-form";
import { getAtlasAuthReadiness } from "@/lib/auth-readiness";
import { uiLocaleMeta, type UiLocale } from "@/lib/i18n/ui";
import { canRegisterPatient } from "@/lib/patient-registration";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create a patient account — Atlas",
  robots: { index: false, follow: false },
};

type RegistrationPageProps = {
  searchParams: Promise<{ lang?: string | string[] }>;
};

type RegistrationCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  language: string;
  stepsTitle: string;
  steps: readonly [string, string, string];
  privacyTitle: string;
  privacy: string;
  verifyTitle: string;
  verifyHelp: string;
  notAvailable: string;
  notAvailableHelp: string;
  existing: string;
  account: string;
  findCare: string;
};

const copy: Record<UiLocale, RegistrationCopy> = {
  en: {
    eyebrow: "Atlas Patient",
    title: "Create your patient account",
    intro: "Start with your mobile number. No medical history or clinic details are needed.",
    language: "Choose your language",
    stepsTitle: "How it works",
    steps: [
      "Enter your Iraqi mobile number.",
      "Verify the one-time code sent to your phone.",
      "Add your name and preferred language in your private patient profile, when you're ready.",
    ],
    privacyTitle: "Your account stays yours",
    privacy: "A patient account never joins a clinic workspace. Only appointments securely linked to your verified identity can appear in your account.",
    verifyTitle: "Verify your mobile number",
    verifyHelp: "If you already have a patient account, the same number opens it. We won't make a second account.",
    notAvailable: "New patient registration is not available yet.",
    notAvailableHelp: "You can still search for doctors, or sign in to an existing patient account when phone verification is available.",
    existing: "Already have an account? Sign in",
    account: "My appointments",
    findCare: "Find care",
  },
  ku: {
    eyebrow: "Atlas Patient",
    title: "هەژماری نەخۆشی دروست بکە",
    intro: "تەنها ژمارەی مۆبایلەکەت پێویستە بۆ دەستپێکردن. زانیاری نەخۆشی یان کلینیکت لێ ناپرسین.",
    language: "زمانەکەت هەڵبژێرە",
    stepsTitle: "چۆن کار دەکات؟",
    steps: [
      "ژمارەی مۆبایلی عێراقی خۆت بنووسە.",
      "ئەو کۆدەی بۆ مۆبایلەکەت دەنێردرێت پشتڕاست بکەرەوە.",
      "هەر کات ئامادە بوویت، ناو و زمانەکەت لە زانیارییە تایبەتییەکانت زیاد بکە.",
    ],
    privacyTitle: "هەژمارەکەت تایبەتە بە خۆت",
    privacy: "هەژماری نەخۆش تۆ ناخاتە ناو شوێنی کاری هیچ کلینیکێکەوە. تەنها ئەو مەوعیدانە دەبینیت کە بە شێوەیەکی پارێزراو بە ناسنامەی پشتڕاستکراوی تۆ پەیوەستن.",
    verifyTitle: "ژمارەی مۆبایلەکەت پشتڕاست بکەرەوە",
    verifyHelp: "ئەگەر پێشتر هەژمارت هەیە، هەمان ژمارە هەژمارەکەت دەکاتەوە؛ هەژمارێکی دووەم دروست ناکەین.",
    notAvailable: "دروستکردنی هەژماری نوێی نەخۆش هێشتا بەردەست نییە.",
    notAvailableHelp: "دەتوانیت بەدوای دکتۆردا بگەڕێیت، یان کاتێک پشتڕاستکردنەوەی مۆبایل بەردەست بوو بچیتە هەژمارە هەبووەکەت.",
    existing: "هەژمارت هەیە؟ بچۆ ژوورەوە",
    account: "مەوعیدەکانم",
    findCare: "دکتۆر بدۆزەوە",
  },
  bd: {
    eyebrow: "Atlas Patient",
    title: "هەژمارەکا نەخۆشی دروست بکە",
    intro: "بۆ دەستپێکرنێ تەنێ ژمارا موبایلا تە پێدڤییە. پرسیارێن نەخۆشی یان کلینیکێ ناکەین.",
    language: "زمانێ خۆ هەلبژێرە",
    stepsTitle: "چۆن کار دکەت؟",
    steps: [
      "ژمارا موبایلا خۆ یا عێراقێ بنڤیسە.",
      "ئەو کۆدێ بۆ موبایلا تە دهێتە هنارتن پشتڕاست بکە.",
      "هەر دەم ئامادە بووی، ناڤ و زمانێ خۆ ل زانیاریێن تایبەت زیاد بکە.",
    ],
    privacyTitle: "هەژمارا تە تایبەتە ب خۆ تە",
    privacy: "هەژمارا نەخۆشی تە ناکەتە ئەندامێ هیچ کلینیکەکێ. تەنێ ئەو وادەیێن ب ناسناما پشتڕاستکری یا تە گرێدای دکاری ببینی.",
    verifyTitle: "ژمارا موبایلا خۆ پشتڕاست بکە",
    verifyHelp: "ئەگەر هەژمارەکا تە هەبیت، ب هەمان ژمارێ دێ ڤەبیت؛ هەژمارەکا دی دروست ناکەین.",
    notAvailable: "دروستکرنا هەژمارەکا نوو یا نەخۆشی هێشتا بەردەست نینە.",
    notAvailableHelp: "دکاری دکتۆران ببینی یان دەمێ پشتڕاستکرنا موبایلێ بەردەست بوو بچیە هەژمارا خۆ.",
    existing: "هەژمارا تە هەیە؟ بچۆ ژوور",
    account: "وادەیێن من",
    findCare: "دکتۆر بدیتەوە",
  },
  ar: {
    eyebrow: "Atlas Patient",
    title: "أنشئ حسابك كمريض",
    intro: "تحتاج رقم موبايلك فقط للبدء. ما راح نسألك عن تاريخك المرضي أو تفاصيل عيادتك.",
    language: "اختر لغتك",
    stepsTitle: "شلون تشتغل؟",
    steps: [
      "اكتب رقم موبايلك العراقي.",
      "أكّد الرمز المرسل لموبايلك.",
      "تگدر تضيف اسمك ولغتك المفضلة بملفك الخاص من تكون جاهز.",
    ],
    privacyTitle: "حسابك يبقى خاص بيك",
    privacy: "حساب المريض ما يدخلك بأي مساحة عمل للعيادات. بس المواعيد المرتبطة بهويتك الموثقة بصورة آمنة تگدر تظهر بحسابك.",
    verifyTitle: "أكّد رقم موبايلك",
    verifyHelp: "إذا عندك حساب مريض من قبل، نفس الرقم يفتحه بدون إنشاء حساب ثاني.",
    notAvailable: "إنشاء حساب مريض جديد غير متاح حالياً.",
    notAvailableHelp: "تگدر تبحث عن الأطباء، أو تدخل لحسابك الموجود من يصير التحقق بالموبايل متاح.",
    existing: "عندك حساب؟ سجّل دخول",
    account: "مواعيدي",
    findCare: "ابحث عن طبيب",
  },
};

const languages: UiLocale[] = ["ku", "bd", "ar", "en"];

export default async function PatientRegistrationPage({ searchParams }: RegistrationPageProps) {
  const { lang } = await searchParams;
  const locale = await resolvePatientLocale(lang);
  const t = copy[locale];
  const localeMeta = uiLocaleMeta[locale];
  const readiness = await getAtlasAuthReadiness();
  const signupAvailable = canRegisterPatient(readiness);

  return (
    <main className="patient-register-page" lang={localeMeta.language} dir={localeMeta.direction}>
      <AtlasPatientNav
        locale={locale}
        actionHref={`/patient-account?lang=${locale}`}
        actionLabel={t.account}
        hideLanguageSwitcher
      />
      <div className="patient-register-shell">
        <nav className="patient-register-languages" aria-label={t.language}>
          {languages.map((language) => (
            <Link
              key={language}
              href={`/patient-register?lang=${language}`}
              lang={uiLocaleMeta[language].language}
              dir={uiLocaleMeta[language].direction}
              aria-current={locale === language ? "page" : undefined}
            >
              {uiLocaleMeta[language].nativeLabel}
            </Link>
          ))}
        </nav>

        <header className="patient-register-header">
          <div className="eyebrow">{t.eyebrow}</div>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
        </header>

        <div className="patient-register-grid">
          <section className="patient-register-explanation" aria-labelledby="patient-register-steps-title">
            <h2 id="patient-register-steps-title">{t.stepsTitle}</h2>
            <ol className="patient-register-steps">
              {t.steps.map((step, index) => (
                <li key={index}>
                  <span aria-hidden="true">{index + 1}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
            <aside className="patient-register-privacy">
              <h3>{t.privacyTitle}</h3>
              <p>{t.privacy}</p>
            </aside>
          </section>

          <section className="patient-register-panel" aria-labelledby="patient-register-verify-title">
            <h2 id="patient-register-verify-title">{t.verifyTitle}</h2>
            {signupAvailable ? (
              <>
                <p className="patient-register-help">{t.verifyHelp}</p>
                <PatientAccountLoginForm
                  locale={locale}
                  ready={true}
                  allowSignup={true}
                  whatsappOtpEnabled={readiness.whatsappOtpEnabled}
                />
              </>
            ) : (
              <div className="patient-register-unavailable" role="status">
                <strong>{t.notAvailable}</strong>
                <p>{t.notAvailableHelp}</p>
              </div>
            )}
            <div className="patient-register-links">
              <Link href={`/patient-account?lang=${locale}`}>{t.existing}</Link>
              <Link href={`/care?lang=${locale}`}>{t.findCare}</Link>
            </div>
          </section>
        </div>
      </div>
      <style>{`
        .patient-register-page{min-height:100dvh;background:var(--canvas);color:var(--ink)}
        .patient-register-shell{width:min(100% - 32px,1080px);margin:0 auto;padding:24px 0 72px}
        .patient-register-languages{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:30px}
        .patient-register-languages a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;border:1px solid var(--line);border-radius:12px;padding:8px 14px;color:var(--ink);background:var(--surface);text-decoration:none;font-size:12px;font-weight:750}
        .patient-register-languages a[aria-current="page"]{border-color:var(--accent);background:var(--accent-soft);color:var(--accent)}
        .patient-register-languages a:focus-visible,.patient-register-links a:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
        .patient-register-header{max-width:760px;margin-bottom:30px}
        .patient-register-header .eyebrow{color:var(--accent)}
        .patient-register-header h1{margin:8px 0 12px;font-size:clamp(30px,4.6vw,46px);line-height:1.2;letter-spacing:-.035em}
        .patient-register-header p{max-width:640px;color:var(--muted);font-size:15px;line-height:1.7}
        .patient-register-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,470px);align-items:start;gap:24px}
        .patient-register-explanation{min-width:0;padding:12px 4px}
        .patient-register-explanation h2,.patient-register-panel h2{margin:0 0 17px;font-size:21px;line-height:1.35}
        .patient-register-steps{display:grid;gap:16px;list-style:none;padding:0;margin:0}
        .patient-register-steps li{display:flex;align-items:flex-start;gap:14px}
        .patient-register-steps li>span{flex:0 0 34px;display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--accent-soft);color:var(--accent);font-weight:850}
        .patient-register-steps p{margin:4px 0 0;line-height:1.65;font-size:14px}
        .patient-register-privacy{margin-top:26px;padding:18px;border:1px solid var(--line);border-radius:16px;background:var(--surface)}
        .patient-register-privacy h3{margin:0 0 8px;font-size:15px}
        .patient-register-privacy p{margin:0;color:var(--muted);line-height:1.65;font-size:12px}
        .patient-register-panel{min-width:0;border:1px solid var(--line);border-radius:22px;padding:clamp(20px,3vw,30px);background:var(--surface);box-shadow:var(--shadow-sm)}
        .patient-register-help{margin:0 0 20px;color:var(--muted);font-size:13px;line-height:1.65}
        .patient-register-unavailable{padding:16px;border:1px solid var(--line);border-radius:14px;background:var(--surface-soft)}
        .patient-register-unavailable strong{font-size:14px}
        .patient-register-unavailable p{margin:7px 0 0;color:var(--muted);font-size:13px;line-height:1.6}
        .patient-register-links{display:flex;flex-wrap:wrap;gap:12px 20px;margin-top:24px;padding-top:18px;border-top:1px solid var(--line)}
        .patient-register-links a{color:var(--accent);font-size:12px;font-weight:800;text-decoration:underline;text-underline-offset:3px}
        .patient-register-panel .patient-account-login-form input{width:100%;min-height:48px}
        .patient-register-panel .patient-account-login-form>.button{min-height:48px;width:100%}
        [dir="rtl"] .patient-register-header h1{letter-spacing:0}
        @media(max-width:800px){.patient-register-grid{grid-template-columns:minmax(0,1fr)}.patient-register-explanation{padding:0}.patient-register-panel{max-width:680px;width:100%}}
        @media(max-width:520px){.patient-register-shell{width:min(100% - 24px,1080px);padding-top:18px}.patient-register-languages{gap:6px;margin-bottom:24px}.patient-register-languages a{flex:1 1 calc(50% - 6px);padding-inline:8px}.patient-register-header{margin-bottom:24px}.patient-register-header p{font-size:14px}.patient-register-panel{padding:19px;border-radius:18px}.patient-register-privacy{margin-top:20px}}
      `}</style>
    </main>
  );
}
