import Link from "next/link";
import { redirect } from "next/navigation";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { uiText } from "@/lib/i18n/ui";
import { getLoginMessage } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";
import { PasskeySignIn } from "./passkey-sign-in";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const passkeySubtitle = {
  en: "Set up a passkey once, then open Atlas with Face ID, Touch ID, your device PIN, or password manager.",
  ku: "یەک جار پاسکی ڕێکبخە، پاشان Atlas بە Face ID، Touch ID، PIN ـی ئامێر یان بەڕێوەبەری وشەی نهێنی بکەرەوە.",
  ar: "أعدّ مفتاح مرور مرة واحدة، ثم افتح Atlas باستخدام Face ID أو Touch ID أو رمز الجهاز أو مدير كلمات المرور.",
} as const;

const firstTimeCopy = {
  en: {
    title: "First time on this device?",
    body: "Sign in once with your work email, then open Settings and set up a passkey. After that, no email link is needed on this device.",
  },
  ku: {
    title: "یەکەم جارە لەم ئامێرە؟",
    body: "یەک جار بە ئیمەیڵی کار بچۆ ژوورەوە، پاشان لە ڕێکخستنەکان پاسکی دروست بکە. دوای ئەوە بەستەری ئیمەیڵ پێویست نابێت.",
  },
  ar: {
    title: "أول مرة على هذا الجهاز؟",
    body: "سجّل الدخول مرة واحدة ببريد العمل، ثم افتح الإعدادات وأنشئ مفتاح مرور. بعد ذلك لن تحتاج إلى رابط بريد على هذا الجهاز.",
  },
} as const;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/dashboard");

  const locale = await getUiLocale();
  const t = uiText(locale);
  const errorMessage = getLoginMessage(error);

  return (
    <main className="login-page">
      <section className="login-card">
        <Link className="app-brand login-brand" href="/">
          <span className="app-brand-mark" aria-hidden="true">A</span>
          <span className="app-brand-word">Atlas</span>
        </Link>

        <div className="login-copy">
          <div className="eyebrow">{t.loginEyebrow}</div>
          <h1>{t.loginTitle}</h1>
          <p>{passkeySubtitle[locale]}</p>
        </div>

        {errorMessage ? <p className="notice notice-error login-notice" role="alert">{errorMessage}</p> : null}

        <PasskeySignIn />

        <div className="auth-alternative">
          <span>{firstTimeCopy[locale].title}</span>
          <p className="quiet">{firstTimeCopy[locale].body}</p>
        </div>

        <LoginForm locale={locale} />

        <div className="auth-alternative login-demo">
          <span>{t.demoPrompt}</span>
          <Link className="button button-ghost" href="/demo">{t.openDemo}</Link>
          <p className="quiet">{t.demoHelp}</p>
        </div>
      </section>
      <aside className="login-visual" aria-hidden="true">
        <div className="login-visual-card">
          <span className="login-visual-dot" />
          <div>
            <strong>08:30</strong>
            <span>Patient confirmed</span>
          </div>
        </div>
        <div className="login-visual-card is-secondary">
          <span className="login-visual-dot" />
          <div>
            <strong>09:00</strong>
            <span>Next appointment</span>
          </div>
        </div>
        <div className="login-visual-label">Atlas · {t.schedule}</div>
      </aside>
    </main>
  );
}
