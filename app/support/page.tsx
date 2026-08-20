import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support — Atlas",
  description: "Support for Atlas clinic appointments and account access.",
};

const sectionStyle = { marginTop: "28px" } as const;

export default function SupportPage() {
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px 72px", color: "#10251f", lineHeight: 1.7 }}>
      <a href="/" style={{ color: "#087a5b", textDecoration: "none", fontWeight: 700 }}>← Atlas</a>
      <h1 style={{ fontSize: 38, lineHeight: 1.15, margin: "20px 0 8px" }}>Atlas Support</h1>
      <p style={{ marginTop: 0, color: "#5f6f69" }}>Clinic appointments, access, reminders, and account help.</p>

      <section style={sectionStyle}>
        <h2>Clinic staff</h2>
        <p>
          If you were invited to a clinic, open the newest Atlas invitation link from the clinic administrator.
          A secure invitation can be used only once and may expire. If it no longer works, ask the clinic
          administrator to create a fresh invitation from Atlas.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Sign-in help</h2>
        <p>
          Use the same Atlas identity you normally use for the clinic. Depending on the account and device, Atlas
          may offer Sign in with Apple, Google, a passkey/Face ID flow, or email sign-in. Atlas never asks for an
          Apple Account, Google, Gmail, or iCloud password.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Patients</h2>
        <p>
          For appointment changes or questions about information entered by a clinic, contact that clinic directly.
          Atlas provides the scheduling software but does not provide medical advice or emergency care.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Account and privacy</h2>
        <p>
          Signed-in account holders can delete their Atlas account from <strong>Settings → Account &amp; deletion</strong>.
          You can also review the <a href="/privacy" style={{ color: "#087a5b" }}>Privacy Policy</a>,
          <a href="/terms" style={{ color: "#087a5b" }}> Terms of Service</a>, and
          <a href="/data-deletion" style={{ color: "#087a5b" }}> Data Deletion instructions</a>.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Contact Atlas</h2>
        <p>
          Until the Atlas company domain mailbox is activated, support requests may be sent to
          <a href="mailto:niazsarbastahmad2002@gmail.com" style={{ color: "#087a5b" }}> niazsarbastahmad2002@gmail.com</a>.
          This page will move to the permanent Atlas company support address before App Store submission.
        </p>
      </section>
    </main>
  );
}
