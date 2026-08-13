"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="center-page">
      <section className="auth-card">
        <div className="brand">Atlas</div>
        <h1>Something went wrong.</h1>
        <p className="quiet">No patient data was changed by this screen.</p>
        <button className="button" onClick={reset} type="button">Try again</button>
      </section>
    </main>
  );
}
