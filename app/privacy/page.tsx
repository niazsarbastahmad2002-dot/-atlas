import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Atlas",
  description: "Privacy policy for Atlas Clinic Platform.",
};

const sectionStyle = { marginTop: "28px" } as const;

export default function PrivacyPolicyPage() {
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px 72px", color: "#10251f", lineHeight: 1.7 }}>
      <a href="/" style={{ color: "#087a5b", textDecoration: "none", fontWeight: 700 }}>← Atlas</a>
      <h1 style={{ fontSize: 38, lineHeight: 1.15, margin: "20px 0 8px" }}>Privacy Policy</h1>
      <p style={{ marginTop: 0, color: "#5f6f69" }}>Effective: 18 August 2026</p>

      <p>
        Atlas Clinic Platform ("Atlas") is an appointment and reminder system for clinics. This policy explains
        what information Atlas may process, why it is processed, and the choices available to clinics, staff,
        and patients.
      </p>

      <section style={sectionStyle}>
        <h2>Information we process</h2>
        <p>
          Depending on how a clinic uses Atlas, information may include clinic and staff account details,
          patient names and phone numbers, appointment date and time, assigned doctor, appointment status,
          reminder language and settings, and limited technical or security logs needed to operate the service.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>How information is used</h2>
        <p>
          Atlas uses information to create and manage appointments, provide clinic staff with scheduling tools,
          send or track appointment reminders when enabled, protect accounts and clinic data, troubleshoot the
          service, and maintain reliable operation.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>WhatsApp reminders</h2>
        <p>
          When a clinic enables WhatsApp reminders, relevant phone-number and appointment-reminder information
          may be transmitted through the WhatsApp Business Platform operated by Meta. Atlas may also receive
          delivery-status events so the clinic can know whether a reminder was sent or delivered. Clinics are
          responsible for using messaging in accordance with applicable consent and messaging rules.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Service providers</h2>
        <p>
          Atlas may rely on infrastructure and service providers, including hosting, database, authentication,
          and messaging providers, only as needed to operate the platform. These can include Vercel, Supabase,
          and Meta/WhatsApp. Atlas does not sell patient or clinic personal information.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Data retention and deletion</h2>
        <p>
          Information is retained only as reasonably needed for clinic operations, security, record integrity,
          and applicable obligations. Clinics control their appointment records within Atlas. Requests to access,
          correct, or delete patient information should normally be directed to the clinic that collected it.
          Atlas account holders may also request deletion using the instructions on the Data Deletion page.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Security</h2>
        <p>
          Atlas uses access controls, tenant separation, encrypted network connections, and other technical and
          organizational safeguards designed to protect clinic and patient information. No online system can be
          guaranteed to be completely secure.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Your choices</h2>
        <p>
          Clinics can manage staff access and reminder settings. Patients may ask their clinic to correct or
          remove information held for appointment purposes, subject to any legitimate record-retention needs.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Changes to this policy</h2>
        <p>
          This policy may be updated as Atlas develops. The effective date above will be updated when material
          changes are made.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Contact</h2>
        <p>
          Privacy questions may be sent to <a href="mailto:niazsarbastahmad2002@gmail.com" style={{ color: "#087a5b" }}>niazsarbastahmad2002@gmail.com</a>.
        </p>
      </section>
    </main>
  );
}
