import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Deletion — Atlas",
  description: "Instructions for requesting deletion of Atlas data.",
};

const sectionStyle = { marginTop: "28px" } as const;

export default function DataDeletionPage() {
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px 72px", color: "#10251f", lineHeight: 1.7 }}>
      <a href="/" style={{ color: "#087a5b", textDecoration: "none", fontWeight: 700 }}>← Atlas</a>
      <h1 style={{ fontSize: 38, lineHeight: 1.15, margin: "20px 0 8px" }}>Data Deletion Instructions</h1>
      <p style={{ marginTop: 0, color: "#5f6f69" }}>Last updated: 18 August 2026</p>

      <section style={sectionStyle}>
        <h2>Patients</h2>
        <p>
          If your information was entered into Atlas by a clinic, contact that clinic first. The clinic controls
          its appointment records and can review, correct, archive, or delete information where appropriate and
          subject to legitimate record-retention requirements.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Atlas account holders</h2>
        <p>
          To request deletion of an Atlas account or related personal information, email
          <a href="mailto:niazsarbastahmad2002@gmail.com" style={{ color: "#087a5b" }}> niazsarbastahmad2002@gmail.com</a>
          with the subject <strong>Atlas Data Deletion Request</strong>. Include the account email address and clinic
          name associated with the request. Additional verification may be required before deletion to protect
          against unauthorized requests.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>What happens next</h2>
        <p>
          Valid requests will be reviewed and handled within a reasonable period. Some information may be retained
          when necessary for security, fraud prevention, legal obligations, dispute resolution, or record integrity.
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
