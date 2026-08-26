import Link from "next/link";
import { redirect } from "next/navigation";
import { atlasPublicCompanyProfile } from "@/lib/public-company-profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const essentials = [
  ["Schedule", "See the clinic day and add the next patient fast."],
  ["Follow-up", "Confirm, cancel, complete, or mark no-show without leaving the schedule."],
  ["Communication", "Private patient links now; WhatsApp automation when provider approval is ready."],
] as const;

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/dashboard");
  const company = atlasPublicCompanyProfile();

  return (
    <main className="marketing-page atlas-simple-home">
      <nav className="nav shell marketing-nav">
        <Link className="app-brand atlas-marketing-brand" href="/" aria-label="Atlas home">
          <span className="app-brand-mark" aria-hidden="true">A</span>
          <span className="app-brand-word">Atlas</span>
        </Link>
      </nav>

      <section className="hero shell atlas-simple-hero">
        <div className="eyebrow">Clinic appointments</div>
        <h1>Your clinic day, in one place.</h1>
        <p className="hero-copy">
          Schedule patients, keep the queue clear, and handle confirmations without turning reception into a complicated system.
        </p>
        <div className="hero-actions atlas-home-actions" aria-label="Choose Atlas mode">
          <Link className="button atlas-mode-button" href="/dashboard">
            <strong>Atlas Online</strong>
            <span>Cloud, staff, WhatsApp & AI</span>
          </Link>
          <a className="button button-ghost atlas-mode-button atlas-local-mode" href="/atlas-local.html">
            <strong>Atlas Local</strong>
            <span>Works on this device without internet</span>
          </a>
        </div>
        <p className="quiet atlas-mode-note">
          Choose the version that fits the clinic. Online and Local stay separate so offline appointments never silently overwrite cloud data.
        </p>
        <Link className="atlas-demo-link" href="/demo">Try a sample clinic</Link>
        <p className="quiet atlas-scope-note">Scheduling and patient communication only — keep medical notes in the clinic&apos;s approved record system.</p>
      </section>

      <section className="shell atlas-simple-essentials" aria-label="What Atlas does">
        {essentials.map(([title, text]) => (
          <div key={title}><strong>{title}</strong><span>{text}</span></div>
        ))}
      </section>

      <footer className="shell atlas-simple-footer">
        <Link href="/support">Support</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        {company.isVerifiedCompanyProfile && company.legalEntityName ? <span className="quiet">{company.legalEntityName}</span> : null}
      </footer>

      <style>{`
        .atlas-simple-home{min-height:100dvh}.atlas-marketing-brand .app-brand-word{color:var(--ink);opacity:1}.atlas-simple-hero{max-width:850px;padding-top:clamp(72px,12vh,132px);padding-bottom:42px}.atlas-simple-hero h1{max-width:720px}.atlas-simple-hero .hero-copy{max-width:650px}.atlas-home-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;max-width:650px}.atlas-mode-button{min-height:74px;display:grid;align-content:center;justify-items:start;gap:4px;text-align:left;text-decoration:none}.atlas-mode-button strong{font-size:14px}.atlas-mode-button span{font-size:10.5px;font-weight:650;opacity:.82}.atlas-local-mode{color:var(--accent);background:rgba(255,255,255,.8);border-color:rgba(8,119,90,.2)}.atlas-local-mode:hover{background:#fff;border-color:rgba(8,119,90,.35)}.atlas-mode-note{max-width:650px;margin-top:12px;font-size:11.5px}.atlas-demo-link{display:inline-flex;margin-top:9px;color:var(--accent);font-size:12px;font-weight:800;text-decoration:none}.atlas-demo-link:hover{text-decoration:underline}.atlas-scope-note{max-width:620px;margin-top:18px}.atlas-simple-essentials{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;overflow:hidden;border:1px solid var(--line);border-radius:18px;background:var(--line)}.atlas-simple-essentials>div{display:grid;gap:6px;padding:18px;background:#fff}.atlas-simple-essentials strong{font-size:13px}.atlas-simple-essentials span{color:var(--muted);font-size:12px;line-height:1.55}.atlas-simple-footer{display:flex;gap:16px;flex-wrap:wrap;padding-top:26px;padding-bottom:48px;color:var(--muted);font-size:12px}.atlas-simple-footer a{color:inherit}@media(max-width:680px){.atlas-simple-essentials{grid-template-columns:1fr}.atlas-simple-hero{padding-top:54px}.atlas-home-actions{grid-template-columns:1fr}}
      `}</style>
    </main>
  );
}
