import Link from "next/link";
import { getLoginMessage } from "@/lib/messages";
import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const errorMessage = getLoginMessage(error);

  return (
    <main className="center-page">
      <section className="auth-card">
        <Link className="brand" href="/">Atlas</Link>
        <div className="eyebrow">Clinic access</div>
        <h1>Sign in without a password.</h1>
        <p className="quiet">We will email you a one-time secure link.</p>

        {errorMessage ? <p className="notice notice-error" role="alert">{errorMessage}</p> : null}
        <LoginForm />

        <div className="auth-alternative">
          <span>Want to try Atlas immediately?</span>
          <Link className="button button-ghost" href="/demo">Open test workspace</Link>
          <p className="quiet">No email required. Test data stays separate from clinic records.</p>
        </div>
      </section>
    </main>
  );
}
