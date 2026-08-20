import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Deletion — Atlas",
  description: "How patients and Atlas account holders can delete Atlas data.",
};

const sectionStyle = { marginTop: "28px" } as const;

export default function DataDeletionPage() {
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px 72px", color: "#10251f", lineHeight: 1.7 }}>
      <a href="/" style={{ color: "#087a5b", textDecoration: "none", fontWeight: 700 }}>← Atlas</a>
      <h1 style={{ fontSize: 38, lineHeight: 1.15, margin: "20px 0 8px" }}>Data Deletion</h1>
      <p style={{ marginTop: 0, color: "#5f6f69" }}>Last updated: 21 August 2026</p>

      <section style={sectionStyle}>
        <h2>Atlas account holders</h2>
        <p>
          You can permanently delete your Atlas account directly inside Atlas. Sign in, open <strong>Settings</strong>,
          choose <strong>Delete my Atlas account</strong>, and type your account email exactly to confirm. Atlas then
          deletes the sign-in account and clinic memberships. If the account owns a clinic, the confirmation screen
          also explains that deleting the owner account permanently deletes the clinics it owns and their connected
          clinic data.
        </p>
        <p>
          When Sign in with Apple is used in the Atlas iOS app, Atlas also attempts to revoke the retained Apple
          authorization during account deletion and removes the encrypted provider token held for that purpose.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Patients</h2>
        <p>
          If your information was entered into Atlas by a clinic, contact that clinic. The clinic controls its
          appointment records and can review, correct, archive, or delete information where appropriate and subject
          to legitimate record-retention requirements.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>If you cannot access your account</h2>
        <p>
          For account-access or deletion assistance, email
          <a href="mailto:niazsarbastahmad2002@gmail.com" style={{ color: "#087a5b" }}> niazsarbastahmad2002@gmail.com</a>
          with the subject <strong>Atlas Account Help</strong>. Atlas may require identity verification before acting
          on an account that cannot be accessed, to protect against unauthorized deletion.
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
