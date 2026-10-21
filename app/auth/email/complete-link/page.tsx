"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { extractAtlasMagicLinkToken } from "@/lib/auth/atlas-email-link";
import { createClient } from "@/lib/supabase/client";

type VerificationStatus = "ready" | "verifying" | "invalid" | "failed";

/**
 * Manual fallback for browsers that cannot hand off a one-time email link.
 * The user pastes their link into a form on Atlas's own origin. We verify
 * its token hash with Supabase's existing browser client and cookie store,
 * without opening the external /verify URL or writing tokens into the URL,
 * logs, server actions, analytics or persistent browser storage.
 */
export default function CompleteAtlasEmailLinkPage() {
  const linkField = useRef<HTMLTextAreaElement>(null);
  const [status, setStatus] = useState<VerificationStatus>("ready");
  const busy = status === "verifying";

  async function completeLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const tokenHash = extractAtlasMagicLinkToken(
      linkField.current?.value ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    );

    // Clear the bearer credential from the form before any network request.
    if (linkField.current) linkField.current.value = "";

    if (!tokenHash) {
      setStatus("invalid");
      return;
    }

    setStatus("verifying");

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "magiclink",
      });
      if (error || !data.session || !data.user) throw new Error("verification_failed");

      // Existing activation confirms a real server-visible session and never
      // grants clinic membership merely because an email was verified.
      window.location.replace("/auth/activate?next=%2Fdashboard%2Fselect-clinic");
    } catch {
      // Never include provider errors, links, hashes or auth tokens in UI/logs.
      setStatus("failed");
    }
  }

  return (
    <main className="center-page">
      <section className="auth-card">
        <div className="app-brand"><span className="app-brand-mark">A</span><span>Atlas</span></div>
        <h1>Complete Atlas email sign-in</h1>
        <p className="quiet">
          Use this only if opening your Atlas sign-in email does not complete in this browser.
          Copy the link from the latest Atlas email and paste it below instead of opening it.
          The link is verified here on Atlas; it is never sent to another website.
        </p>

        <form className="stack-form" onSubmit={completeLink}>
          <label htmlFor="atlas-email-verification-link">Your latest Atlas sign-in link</label>
          <textarea
            id="atlas-email-verification-link"
            ref={linkField}
            rows={3}
            required
            disabled={busy}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            placeholder="Paste the complete link from the Open Atlas email button"
          />
          <button className="button" type="submit" disabled={busy}>
            {busy ? "Verifying…" : "Verify and open my clinic"}
          </button>
          {status === "invalid" ? (
            <p className="notice notice-error" role="alert">
              This is not a complete Atlas email sign-in link. Copy the latest link again.
            </p>
          ) : null}
          {status === "failed" ? (
            <p className="notice notice-error" role="alert">
              This Atlas link could not be verified or has already been used.
              Request a fresh link only after checking the copied address.
            </p>
          ) : null}
        </form>
        <p className="quiet">
          Do not share sign-in links or screenshots containing them with anyone,
          including a support chat. <Link href="/login">Back to Atlas login</Link>
        </p>
      </section>
    </main>
  );
}
