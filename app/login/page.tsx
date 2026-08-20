import Link from "next/link";
import { redirect } from "next/navigation";
import { getUiLocale } from "@/lib/i18n/ui-server";
import type { UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";
import { CreateClinicAccount } from "./create-clinic-account";
import { LoginForm } from "./login-form";
import { LoginLanguagePicker } from "./language-picker";

type LoginPageProps = { searchParams: Promise<{ error?: string; notice?: string }> };
type LoginPageCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  invalid: string;
  signedOut: string;
  accountDeleted: string;
  appleRevokeNeeded: string;
  stageSignal: string;
  stagePulse: string;
  language: string;
};

const pageCopy: Record<UiLocale, LoginPageCopy> = {
  en: {
    eyebrow: "Front desk",
    title: "Open Atlas. Start the clinic day.",
    subtitle: "Appointments ready. Reception in control.",
    invalid: "That email link expired or was already used. Request a fresh Atlas email below.",
    signedOut: "You signed out safely.",
    accountDeleted: "Your Atlas account was permanently deleted.",
    appleRevokeNeeded: "Your Atlas account was deleted. Apple access could not be revoked automatically. On iPhone, open Settings → your name → Sign in with Apple → Atlas, then tap Delete / Stop Using.",
    stageSignal: "Clinic day. One clear flow.",
    stagePulse: "Secure reception workspace",
    language: "Choose your language",
  },
  ku: {
    eyebrow: "سکرتێر",
    title: "Atlas بکەرەوە. ڕۆژی کلینیک دەستپێبکە.",
    subtitle: "کاتەکان ئامادەن. کاری سکرتێر ڕوون و خێرایە.",
    invalid: "ئەم بەستەرە بەسەرچووە یان پێشتر بەکارهاتووە. ئیمەیڵێکی نوێی Atlas داوا بکە.",
    signedOut: "بە سەلامەتی چوویتە دەرەوە.",
    accountDeleted: "هەژماری Atlas ـەکەت بە هەمیشەیی سڕایەوە.",
    appleRevokeNeeded: "هەژماری Atlas ـەکەت سڕایەوە، بەڵام دەسەڵاتی Apple خۆکارانە هەڵنەوەشایەوە. لە iPhone: Settings → ناوت → Sign in with Apple → Atlas، پاشان Delete / Stop Using دابگرە.",
    stageSignal: "ڕۆژی کلینیک، بە یەک ڕەوت.",
    stagePulse: "شوێنی کاری پارێزراوی سکرتێر",
    language: "زمانەکەت هەڵبژێرە",
  },
  bd: {
    eyebrow: "سکرتێر",
    title: "Atlas ڤەکە. ڕۆژا کلینیکێ دەست پێ بکە.",
    subtitle: "وادە ئامادەن. کارێ سکرتێرێ ڕوون و خێرایە.",
    invalid: "ئەم لینکە بەسەرچووە یان پێشتر هاتییە بکارئینان. ئیمەیلا نوو یا Atlas بخوازە.",
    signedOut: "ب سەلامەتی چوویە دەرڤە.",
    accountDeleted: "هەژمارا Atlas یا تە بۆ هەردەم هاتە ژێبرن.",
    appleRevokeNeeded: "هەژمارا Atlas یا تە هاتە ژێبرن، لێ دەستهەلاتا Apple خودکار نەهاتە هەلوەشاندن. ل iPhone: Settings → ناڤێ تە → Sign in with Apple → Atlas، پاشی Delete / Stop Using بکە.",
    stageSignal: "ڕۆژا کلینیکێ، ب ڕێکەکا ڕوون.",
    stagePulse: "شوێنێ کاری پاراستی یێ سکرتێرێ",
    language: "زمانێ خۆ هەلبژێرە",
  },
  ar: {
    eyebrow: "الاستقبال",
    title: "افتح Atlas وابدأ يوم العيادة.",
    subtitle: "المواعيد جاهزة. الاستقبال مسيطر على اليوم.",
    invalid: "رابط الدخول انتهت صلاحيته أو انستخدم قبل. اطلب إيميل Atlas جديد من جوه.",
    signedOut: "تم تسجيل الخروج بأمان.",
    accountDeleted: "تم حذف حسابك في Atlas نهائياً.",
    appleRevokeNeeded: "تم حذف حساب Atlas، لكن تعذر إلغاء صلاحية Apple تلقائياً. على iPhone افتح Settings → اسمك → Sign in with Apple → Atlas، وبعدها اضغط Delete / Stop Using.",
    stageSignal: "يوم العيادة. بمسار واحد.",
    stagePulse: "مساحة استقبال آمنة",
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
  const { error, notice } = await searchParams;
  if (process.env.ATLAS_E2E_NO_AUTH !== "true") {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect("/dashboard");
  }

  const locale = await getUiLocale();
  const copy = pageCopy[locale];
  const errorMessage = error === "invalid_link" ? copy.invalid : null;
  const noticeMessage = notice === "signed_out" ? copy.signedOut
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
        <CreateClinicAccount locale={locale} />
        <LoginForm locale={locale} />
      </section>
    </main>
  );
}
