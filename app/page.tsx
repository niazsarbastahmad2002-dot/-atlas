import Link from "next/link";

const features = [
  ["One clean schedule", "Appointments, confirmations, cancellations and no-shows in one place."],
  ["Built for reception", "Fast forms and clear daily lists without hospital-sized complexity."],
  ["Reminder-ready", "Secure scheduling, signed delivery webhooks and approved-template sending are ready once the provider is connected."],
] as const;

export default function HomePage() {
  return (
    <main>
      <nav className="nav shell">
        <Link className="brand" href="/">Atlas</Link>
        <Link className="button button-small" href="/login">Clinic sign in</Link>
      </nav>

      <section className="hero shell">
        <div className="eyebrow">Clinic appointment assistant</div>
        <h1>Less reception chaos. Fewer missed appointments.</h1>
        <p className="hero-copy">
          Atlas gives small private clinics a simple schedule today and a safe path to automated reminders tomorrow.
        </p>
        <div className="hero-actions">
          <Link className="button" href="/login">Open clinic workspace</Link>
          <Link className="button button-ghost" href="/demo">Test Atlas now</Link>
          <span className="quiet">Pilot software — use synthetic data until privacy review is complete.</span>
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
    </main>
  );
}
