import Link from "next/link";
import { redirect } from "next/navigation";
import { atlasPublicCompanyProfile } from "@/lib/public-company-profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const features = [
  ["One clean schedule", "Appointments, confirmations, cancellations and no-shows in one focused workspace."],
  ["Made for reception", "Fast touch targets, quick time slots and a layout that works on phones, tablets and desktops."],
  ["Reminder-ready", "Secure patient links and WhatsApp reminder infrastructure are ready for provider activation."],
] as const;

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/dashboard");
  const company = atlasPublicCompanyProfile();

  return (
    <main className="marketing-page">
      <nav className="nav shell marketing-nav">
        <Link className="app-brand" href="/">
          <span className="app-brand-mark" aria-hidden="true">A</span>
          <span className="app-brand-word">Atlas</span>
        </Link>
        <Link className="button button-small" href="/dashboard">Open Atlas</Link>
      </nav>

      <section className="hero shell">
        <div className="eyebrow">Clinic appointment workspace</div>
        <h1>Your front desk, without the chaos.</h1>
        <p className="hero-copy">
          Atlas gives small private clinics one calm, fast place to schedule patients, manage confirmations and prepare automated reminders.
        </p>
        <div className="hero-actions">
          <Link className="button" href="/dashboard">Open Atlas</Link>
          <Link className="button button-ghost" href="/demo">Try with sample data</Link>
          <span className="quiet">Scheduling only — keep medical notes in the clinic&apos;s approved record system.</span>
        </div>
      </section>

      <section className="feature-grid shell" aria-label="Atlas features">
        {features.map(([title, copy]) => (
          <article className="feature-card" key={title}>
            <h2>{title}</h2>
            <p>{copy}</p>
          </article>
        ))}
      </section>

      <footer className="shell" style={{ paddingTop: 18, paddingBottom: 48, display: "flex", gap: 18, flexWrap: "wrap" }}>
        <Link href="/support">Support</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/data-deletion">Data deletion</Link>
        {company.isVerifiedCompanyProfile && company.legalEntityName ? (
          <span className="quiet">Operated by {company.legalEntityName}</span>
        ) : null}
      </footer>
    </main>
  );
}
