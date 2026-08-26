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
        <div className="hero-actions atlas-home-actions">
          <Link className="button" href="/dashboard">Open Atlas</Link>
          <Link className="button button-ghost atlas-demo-link" href="/demo">Try a sample clinic</Link>
        </div>
        <div className="atlas-local-entry">
          <span>No reliable internet at the clinic?</span>
          <a href="/atlas-local.html">Use Atlas Local</a>
          <span>— a separate, device-only clinic workspace.</span>
        </div>
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
        .atlas-simple-home{min-height:100dvh}.atlas-marketing-brand .app-brand-word{color:var(--ink);opacity:1}.atlas-simple-hero{max-width:850px;padding-top:clamp(72px,12vh,132px);padding-bottom:42px}.atlas-simple-hero h1{max-width:720px}.atlas-simple-hero .hero-copy{max-width:650px}.atlas-home-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.atlas-demo-link{display:inline-flex;min-height:46px;align-items:center;justify-content:center;color:var(--accent);font-weight:800;text-decoration:none;background:rgba(255,255,255,.72);border-color:rgba(8,119,90,.18)}.atlas-demo-link:hover{background:#fff;border-color:rgba(8,119,90,.3)}.atlas-local-entry{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:15px;color:var(--muted);font-size:12px;line-height:1.5}.atlas-local-entry a{color:var(--accent);font-weight:850;text-decoration:none}.atlas-local-entry a:hover{text-decoration:underline}.atlas-scope-note{max-width:620px;margin-top:18px}.atlas-simple-essentials{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;overflow:hidden;border:1px solid var(--line);border-radius:18px;background:var(--line)}.atlas-simple-essentials>div{display:grid;gap:6px;padding:18px;background:#fff}.atlas-simple-essentials strong{font-size:13px}.atlas-simple-essentials span{color:var(--muted);font-size:12px;line-height:1.55}.atlas-simple-footer{display:flex;gap:16px;flex-wrap:wrap;padding-top:26px;padding-bottom:48px;color:var(--muted);font-size:12px}.atlas-simple-footer a{color:inherit}@media(max-width:680px){.atlas-simple-essentials{grid-template-columns:1fr}.atlas-simple-hero{padding-top:54px}.atlas-home-actions .button{flex:1 1 145px}}
      `}</style>
    </main>
  );
}
