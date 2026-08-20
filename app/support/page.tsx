import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support — Atlas",
  description: "Support information for Atlas Clinic Platform.",
};

const sectionStyle = { marginTop: "28px" } as const;
const linkStyle = { color: "#087a5b" } as const;

export default function SupportPage() {
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px 72px", color: "#10251f", lineHeight: 1.7 }}>
      <a href="/" style={{ ...linkStyle, textDecoration: "none", fontWeight: 700 }}>← Atlas</a>
      <h1 style={{ fontSize: 38, lineHeight: 1.15, margin: "20px 0 8px" }}>Atlas Support</h1>
      <p style={{ marginTop: 0, color: "#5f6f69" }}>Help for clinic owners and reception staff.</p>

      <section style={sectionStyle}>
        <h2>Signing in</h2>
        <p>
          Clinic owners can create their own Atlas account. Receptionists should open the secure invitation link
          shared by their clinic administrator. Returning staff can use the sign-in method available to their account,
          including quick sign-in when previously configured.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Clinic access</h2>
        <p>
          A clinic administrator controls who can access that clinic and which doctor a receptionist is assigned to.
          If you opened Atlas but cannot see the expected clinic, ask the clinic administrator to create a new secure
          invitation link for you.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Account and data deletion</h2>
        <p>
          Atlas account holders can permanently delete their account from Atlas Settings. See the
          <a href="/data-deletion" style={linkStyle}> Data Deletion page</a> for details. Patients should contact the
          clinic that entered their appointment information.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Contact support</h2>
        <p>
          Email <a href="mailto:niazsarbastahmad2002@gmail.com" style={linkStyle}>niazsarbastahmad2002@gmail.com</a>
          with a short description of the problem. Do not email patient medical details, passwords, one-time codes,
          private patient links, or provider credentials.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Policies</h2>
        <p>
          <a href="/privacy" style={linkStyle}>Privacy Policy</a> · <a href="/terms" style={linkStyle}>Terms</a>
        </p>
      </section>
    </main>
  );
}
