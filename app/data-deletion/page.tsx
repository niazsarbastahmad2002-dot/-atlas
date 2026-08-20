import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Deletion — Atlas",
  description: "Instructions for deleting an Atlas account and requesting deletion of Atlas data.",
};

const sectionStyle = { marginTop: "28px" } as const;

export default function DataDeletionPage() {
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px 72px", color: "#10251f", lineHeight: 1.7 }}>
      <a href="/" style={{ color: "#087a5b", textDecoration: "none", fontWeight: 700 }}>← Atlas</a>
      <h1 style={{ fontSize: 38, lineHeight: 1.15, margin: "20px 0 8px" }}>Data Deletion Instructions</h1>
      <p style={{ marginTop: 0, color: "#5f6f69" }}>Last updated: 21 August 2026</p>

      <section style={sectionStyle}>
        <h2>Delete an Atlas account</h2>
        <p>
          Signed-in Atlas account holders can permanently delete their account directly in Atlas from
          <strong> Settings → Account &amp; deletion</strong>. Account deletion removes the Atlas authentication
          identity, active sessions, saved passkeys and clinic memberships. A person who still owns a clinic must
          first transfer administration or permanently delete that clinic so a clinic workspace cannot be removed
          accidentally as a side effect of account deletion.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Patients</h2>
        <p>
          If your information was entered into Atlas by a clinic, contact that clinic first. The clinic controls
          its appointment records and can review, correct, archive, or delete information where appropriate and
          subject to legitimate record-retention requirements.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>What may remain after account deletion</h2>
        <p>
          Clinic appointment records are controlled by the clinic. Limited historical audit information may be
          retained without the deleted account identity where reasonably necessary for security, fraud prevention,
          legal obligations, dispute resolution or record integrity. Atlas does not keep an active login for a
          deleted account.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Need help?</h2>
        <p>
          If you cannot access the in-app deletion control, email
          <a href="mailto:niazsarbastahmad2002@gmail.com" style={{ color: "#087a5b" }}> niazsarbastahmad2002@gmail.com</a>
          with the subject <strong>Atlas Data Deletion Request</strong>. Additional verification may be required to
          protect against unauthorized requests.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Privacy</h2>
        <p>
          For more information about how Atlas handles personal information, see the
          <a href="/privacy" style={{ color: "#087a5b" }}> Privacy Policy</a>.
        </p>
      </section>
    </main>
  );
}
