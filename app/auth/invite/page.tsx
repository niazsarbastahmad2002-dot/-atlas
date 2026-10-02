"use client";

import { useEffect } from "react";

export default function ReceptionistInvitePage() {
  useEffect(() => {
    // This legacy email-era invitation route is intentionally retired.
    // Never consume its auth fragment or grant clinic access automatically.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    window.location.replace("/login?error=invalid_invite");
  }, []);

  return (
    <main className="center-page">
      <section className="auth-card">
        <div className="app-brand"><span className="app-brand-mark">A</span><span>Atlas</span></div>
        <h1>This invitation needs to be replaced.</h1>
        <p className="quiet">Ask the clinic administrator to send a fresh Atlas invitation.</p>
      </section>
    </main>
  );
}
