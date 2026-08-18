import Link from "next/link";
import { redirect } from "next/navigation";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { uiText, type UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";
import { LoginLanguagePicker } from "./language-picker";

type LoginPageProps = { searchParams: Promise<{ error?: string; notice?: string }> };
type LoginPageCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  invalid: string;
  signedOut: string;
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
    stageSignal: "Clinic day. One clear flow.",
    stagePulse: "Secure reception workspace",
    language: "Choose your language",
  },
  ku: {
    eyebrow: "پێشخانە",
    title: "Atlas بکەرەوە. ڕۆژی کلینیک دەستپێبکە.",
    subtitle: "کاتەکان ئامادەن. کاری پێشخانە ڕوون و خێرایە.",
    invalid: "ئەم بەستەرە بەسەرچووە یان پێشتر بەکارهاتووە. ئیمەیڵێکی نوێی Atlas داوا بکە.",
    signedOut: "بە سەلامەتی چوویتە دەرەوە.",
    stageSignal: "ڕۆژی کلینیک، بە یەک ڕەوت.",
    stagePulse: "شوێنی کاری پارێزراوی پێشخانە",
    language: "زمانەکەت هەڵبژێرە",
  },
  ar: {
    eyebrow: "الاستقبال",
    title: "افتح Atlas وابدأ يوم العيادة.",
    subtitle: "المواعيد جاهزة. الاستقبال مسيطر على اليوم.",
    invalid: "رابط الدخول انتهت صلاحيته أو انستخدم قبل. اطلب إيميل Atlas جديد من جوه.",
    signedOut: "تم تسجيل الخروج بأمان.",
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
  const t = uiText(locale);
  const copy = pageCopy[locale];
  const errorMessage = error === "invalid_link" ? copy.invalid : null;
  const noticeMessage = notice === "signed_out" ? copy.signedOut : null;

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
        <LoginForm locale={locale} />
        <div className="auth-alternative login-demo">
          <span>{t.demoPrompt}</span>
          <Link className="button button-ghost" href="/demo">{t.openDemo}</Link>
          <p className="quiet">{t.demoHelp}</p>
        </div>
      </section>
    </main>
  );
}
