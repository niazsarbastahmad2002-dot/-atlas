import Link from "next/link";
import { redirect } from "next/navigation";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { uiText, type UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; notice?: string }>;
};

const pageCopy: Record<UiLocale, { eyebrow: string; title: string; subtitle: string; invalid: string; signedOut: string; confirmed: string; next: string }> = {
  en: {
    eyebrow: "Reception",
    title: "Open Atlas. Start the day.",
    subtitle: "Use the clinic work email to sign in. After that, Atlas normally keeps this trusted device signed in.",
    invalid: "That email link has expired or was already used. Request one fresh Atlas email below.",
    signedOut: "You signed out safely.",
    confirmed: "Patient confirmed",
    next: "Next appointment",
  },
  ku: {
    eyebrow: "پێشخانە",
    title: "Atlas بکەرەوە. کار دەستپێبکە.",
    subtitle: "بە ئیمەیڵی کاری کلینیک بچۆ ژوورەوە. پاشان Atlas بە ئاسایی ئەم ئامێرە متمانەپێکراوە بە چوونەژوورەوە دەهێڵێتەوە.",
    invalid: "ئەم بەستەری ئیمەیڵە بەسەرچووە یان پێشتر بەکارهاتووە. لە خوارەوە ئیمەیڵێکی نوێی Atlas داوا بکە.",
    signedOut: "بە سەلامەتی چوویتە دەرەوە.",
    confirmed: "نەخۆش پشتڕاستی کردەوە",
    next: "وادەی داهاتوو",
  },
  ar: {
    eyebrow: "الاستقبال",
    title: "افتح Atlas وابدأ يومك.",
    subtitle: "استخدم بريد العيادة للعمل لتسجيل الدخول. بعد ذلك يبقي Atlas هذا الجهاز الموثوق مسجلاً للدخول عادةً.",
    invalid: "انتهت صلاحية رابط البريد أو تم استخدامه من قبل. اطلب رسالة Atlas جديدة أدناه.",
    signedOut: "تم تسجيل الخروج بأمان.",
    confirmed: "تم تأكيد المريض",
    next: "الموعد التالي",
  },
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, notice } = await searchParams;

  // Test-only rendering switch: it suppresses the login-page session lookup so
  // Playwright can test the public UI without real staff credentials. Protected
  // routes remain fully authenticated and production never sets this variable.
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
      <section className="login-card">
        <Link className="app-brand login-brand" href="/">
          <span className="app-brand-mark" aria-hidden="true">A</span>
          <span className="app-brand-word">Atlas</span>
        </Link>

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
      <aside className="login-visual" aria-hidden="true">
        <div className="login-visual-card">
          <span className="login-visual-dot" />
          <div><strong>08:30</strong><span>{copy.confirmed}</span></div>
        </div>
        <div className="login-visual-card is-secondary">
          <span className="login-visual-dot" />
          <div><strong>09:00</strong><span>{copy.next}</span></div>
        </div>
        <div className="login-visual-label">Atlas · {t.schedule}</div>
      </aside>
    </main>
  );
}
