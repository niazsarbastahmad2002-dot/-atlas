import Link from "next/link";
import { redirect } from "next/navigation";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { uiText } from "@/lib/i18n/ui";
import { getLoginMessage } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";
import { FirstAccessForm } from "./first-access-form";
import { LoginForm } from "./login-form";
import { PasskeySignIn } from "./passkey-sign-in";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

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
          <div className="eyebrow">First time</div>
          <h1>Open Atlas in under a minute.</h1>
          <p>Your clinic gives you one short setup code. Enter it once, secure this device, and Atlas normally opens straight to your workspace from then on.</p>
        </div>

        {errorMessage ? <p className="notice notice-error login-notice" role="alert">{errorMessage}</p> : null}

        <FirstAccessForm />

        <div className="auth-alternative">
          <span>Already set up, but signed out?</span>
          <p className="quiet">Use your saved passkey only when Atlas no longer has your active session.</p>
        </div>

        <PasskeySignIn />

        <div className="auth-alternative">
          <span>Fallback</span>
          <p className="quiet">Email sign-in stays available for account recovery and the clinic owner. Receptionists do not need it for normal first access.</p>
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
