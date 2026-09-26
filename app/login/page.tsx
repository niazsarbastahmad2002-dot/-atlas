import Link from "next/link";
import { redirect } from "next/navigation";
import { getAtlasAuthReadiness } from "@/lib/auth-readiness";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { isUiLocale, type UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";
import { LegacyLoginForm } from "./legacy/legacy-login-form";
import { LoginForm } from "./login-form";
import { LoginLanguagePicker } from "./language-picker";

type LoginPageProps = { searchParams: Promise<{ error?: string; notice?: string; lang?: string | string[] }> };
type LoginPageCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  invalid: string;
  signedOut: string;
  clinicDeleted: string;
  accountDeleted: string;
  appleRevokeNeeded: string;
  legacyFallback: string;
  authUnavailable: string;
  stageSignal: string;
  stagePulse: string;
  language: string;
};

const pageCopy: Record<UiLocale, LoginPageCopy> = {
  en: {
    eyebrow: "Front desk",
    title: "Your clinic starts with your number.",
    subtitle: "Verify your phone, then open your clinic or create a new one.",
    invalid: "That sign-in session is no longer valid. Request a fresh verification code below.",
    signedOut: "You signed out safely.",
    clinicDeleted: "Your clinic was deleted. Your Atlas account is still safe — verify your phone whenever you want to create a clinic again.",
    accountDeleted: "Your Atlas account was permanently deleted.",
    appleRevokeNeeded: "Your Atlas account was deleted. Apple access could not be revoked automatically. On iPhone, open Settings → your name → Sign in with Apple → Atlas, then tap Delete / Stop Using.",
    legacyFallback: "SMS verification is not active yet. During testing, use email to sign in to an existing Atlas account or create a fresh one after deletion. This temporary email option will be replaced by phone verification when SMS is enabled.",
    authUnavailable: "Atlas sign-in is temporarily unavailable because the phone verification provider is not active yet.",
    stageSignal: "One number. Your clinic workspace.",
    stagePulse: "Secure phone verification",
    language: "Choose your language",
  },
  ku: {
    eyebrow: "سکرتێر",
    title: "کلینیکەکەت بە ژمارەی مۆبایلەکەت دەست پێ دەکات.",
    subtitle: "ژمارەکەت پشتڕاست بکەرەوە، پاشان کلینیکەکەت بکەرەوە یان کلینیکێکی نوێ دروست بکە.",
    invalid: "دانیشتنی چوونەژوورەوەکە چیتر دروست نییە. کۆدێکی نوێ داوا بکە.",
    signedOut: "بە سەلامەتی چوویتە دەرەوە.",
    clinicDeleted: "کلینیکەکەت سڕایەوە، بەڵام هەژماری Atlas ـەکەت پارێزراوە. هەر کات دەتەوێت ژمارەکەت پشتڕاست بکەرەوە و کلینیکێکی نوێ دروست بکە.",
    accountDeleted: "هەژماری Atlas ـەکەت بە هەمیشەیی سڕایەوە.",
    appleRevokeNeeded: "هەژماری Atlas ـەکەت سڕایەوە، بەڵام دەسەڵاتی Apple خۆکارانە هەڵنەوەشایەوە. لە iPhone: Settings → ناوت → Sign in with Apple → Atlas، پاشان Delete / Stop Using دابگرە.",
    legacyFallback: "پشتڕاستکردنەوە بە SMS هێشتا چالاک نییە. لە ماوەی تاقیکردنەوەدا بە ئیمەیڵ دەتوانیت بچیتە هەژمارێکی هەبووی Atlas یان دوای سڕینەوە هەژمارێکی نوێ دروست بکەیت. کاتێک SMS چالاک بوو ئەم هەڵبژاردە کاتییەی ئیمەیڵ جێگای خۆی دەدات بە پشتڕاستکردنەوەی مۆبایل.",
    authUnavailable: "چوونەژوورەوەی Atlas کاتییانە بەردەست نییە، چونکە خزمەتگوزاری پشتڕاستکردنەوەی مۆبایل هێشتا چالاک نییە.",
    stageSignal: "یەک ژمارە، شوێنی کاری کلینیکەکەت.",
    stagePulse: "پشتڕاستکردنەوەی پارێزراوی مۆبایل",
    language: "زمانەکەت هەڵبژێرە",
  },
  bd: {
    eyebrow: "سکرتێر",
    title: "کلینیکا تە ب ژمارا موبایلا تە دەست پێ دکەت.",
    subtitle: "ژمارا خۆ پشتڕاست بکە، پاشی کلینیکا خۆ ڤەکە یان کلینیکەکا نوو دروست بکە.",
    invalid: "دانیشتنا چوونەژوورێ دیگر دروست نینە. کۆدەکێ نوو بخوازە.",
    signedOut: "ب سەلامەتی چوویە دەرڤە.",
    clinicDeleted: "کلینیکا تە هاتە ژێبرن، لێ هەژمارا Atlas یا تە پاراستییە. هەر دەم بخوازیت ژمارا خۆ پشتڕاست بکە و کلینیکەکا نوو دروست بکە.",
    accountDeleted: "هەژمارا Atlas یا تە بۆ هەردەم هاتە ژێبرن.",
    appleRevokeNeeded: "هەژمارا Atlas یا تە هاتە ژێبرن، لێ دەستهەلاتا Apple خودکار نەهاتە هەلوەشاندن. ل iPhone: Settings → ناڤێ تە → Sign in with Apple → Atlas، پاشی Delete / Stop Using بکە.",
    legacyFallback: "پشتڕاستکرن ب SMS هێشتا چالاک نینە. د ماوێ تاقیکرنێ دا ب ئیمەیلێ دکاری بچیە هەژمارەکا Atlas یا هەی یان پشتی ژێبرنێ هەژمارەکا نوو دروست بکەی. دەمێ SMS چالاک بوو ئەڤ هەلبژارتنا ئیمەیلێ یا کاتی دێ ب پشتڕاستکرنا موبایلێ بهێتە گوهارتن.",
    authUnavailable: "چوونەژوورا Atlas بۆ دەمەکێ بەردەست نینە، چونکی خزمەتا پشتڕاستکرنا موبایلێ هێشتا چالاک نینە.",
    stageSignal: "ئێک ژمارە، شوێنێ کارێ کلینیکا تە.",
    stagePulse: "پشتڕاستکرنا پاراستی یا موبایلێ",
    language: "زمانێ خۆ هەلبژێرە",
  },
  ar: {
    eyebrow: "الاستقبال",
    title: "عيادتك تبدأ من رقمك.",
    subtitle: "تحقق من رقم الهاتف، وبعدها افتح عيادتك أو أنشئ عيادة جديدة.",
    invalid: "جلسة تسجيل الدخول لم تعد صالحة. اطلب رمز تحقق جديد بالأسفل.",
    signedOut: "تم تسجيل الخروج بأمان.",
    clinicDeleted: "تم حذف العيادة، لكن حساب Atlas ما زال محفوظاً. تحقق من رقمك عندما تريد إنشاء عيادة جديدة.",
    accountDeleted: "تم حذف حسابك في Atlas نهائياً.",
    appleRevokeNeeded: "تم حذف حساب Atlas، لكن تعذر إلغاء صلاحية Apple تلقائياً. على iPhone افتح Settings → اسمك → Sign in with Apple → Atlas، وبعدها اضغط Delete / Stop Using.",
    legacyFallback: "التحقق بـ SMS ما زال غير مفعّل. خلال الاختبار تقدر تستخدم البريد للدخول إلى حساب Atlas موجود أو لإنشاء حساب جديد بعد الحذف. هذا الخيار المؤقت بالبريد راح يُستبدل بالتحقق برقم الموبايل بعد تفعيل SMS.",
    authUnavailable: "تسجيل الدخول إلى Atlas غير متاح مؤقتاً لأن مزود التحقق برقم الموبايل لم يتم تفعيله بعد.",
    stageSignal: "رقم واحد، مساحة عيادتك.",
    stagePulse: "تحقق آمن برقم الهاتف",
    language: "اختار لغتك",
  },
};

function AtlasLoginLogo() {
  return (
    <Link className="login-logo-lockup" href="/" aria-label="Atlas">
      <img className="login-main-mark" src="/atlas-mark.svg" alt="" aria-hidden="true" />
      <span className="login-logo-copy"><strong>ATLAS</strong></span>
    </Link>
  );
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, notice, lang } = await searchParams;
  const requestedLang = Array.isArray(lang) ? lang[0] : lang;
  const e2eMode = process.env.ATLAS_E2E_NO_AUTH === "true";
  if (!e2eMode) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect("/dashboard");
  }

  const readiness = e2eMode ? null : await getAtlasAuthReadiness();
  const phoneFlowEnabled = e2eMode || readiness?.supabasePhoneEnabled === true;
  const legacyFallbackEnabled = !phoneFlowEnabled && readiness?.supabaseEmailEnabled === true;

  const locale = isUiLocale(requestedLang) ? requestedLang : await getUiLocale();
  const copy = pageCopy[locale];
  const errorMessage = error === "invalid_link" || error === "invalid_otp" ? copy.invalid : null;
  const noticeMessage = notice === "signed_out" ? copy.signedOut
    : notice === "clinic_deleted" ? copy.clinicDeleted
      : notice === "account_deleted" ? copy.accountDeleted
        : notice === "account_deleted_apple_revoke_needed" ? copy.appleRevokeNeeded
          : null;

  return (
    <main className="login-page">
      <aside className="login-visual" aria-hidden="true">
        <div className="login-brand-stage">
          <img className="login-hero-mark" src="/atlas-mark.svg" alt="" />
          <span className="login-stage-word">ATLAS</span>
          <span className="login-stage-signal">{copy.stageSignal}</span>
          <span className="login-stage-pulse">{copy.stagePulse}</span>
        </div>
      </aside>

      <section className="login-card">
        <AtlasLoginLogo />
        <div className="login-language-block">
          <span>{copy.language}</span>
          <LoginLanguagePicker locale={locale} />
        </div>
        <div className="login-copy">
          <div className="eyebrow">{copy.eyebrow}</div>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>
        {errorMessage ? <p className="notice notice-error login-notice" role="alert">{errorMessage}</p> : null}
        {noticeMessage ? <p className="notice notice-success login-notice" role="status">{noticeMessage}</p> : null}
        {phoneFlowEnabled ? (
          <LoginForm locale={locale} />
        ) : legacyFallbackEnabled ? (
          <>
            <p className="notice login-notice" role="status">{copy.legacyFallback}</p>
            <LegacyLoginForm locale={locale} />
          </>
        ) : (
          <p className="notice notice-error login-notice" role="alert">{copy.authUnavailable}</p>
        )}
      </section>
    </main>
  );
}
