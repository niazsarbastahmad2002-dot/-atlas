import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LegacyLoginForm } from "./legacy-login-form";

export const dynamic = "force-dynamic";

export default async function LegacyLoginPage() {
  if (process.env.ATLAS_LEGACY_AUTH_ENABLED !== "true") redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/dashboard/settings");

  return (
    <main className="center-page">
      <section className="auth-card">
        <div className="app-brand"><span className="app-brand-mark" aria-hidden="true">A</span><span>Atlas</span></div>
        <div className="eyebrow">Existing account migration</div>
        <h1>Verify a phone on your current Atlas account.</h1>
        <p className="quiet">
          This temporary route is only for accounts created before Atlas moved to phone sign-in. It never creates a new account.
        </p>
        <LegacyLoginForm />
        <Link className="button button-ghost" href="/login">Back to phone sign-in</Link>
      </section>
    </main>
  );
}
