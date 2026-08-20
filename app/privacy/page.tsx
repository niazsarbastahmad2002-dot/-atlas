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
      <p style={{ marginTop: 0, color: "#5f6f69" }}>Effective: 21 August 2026</p>

      <p>
        Atlas Clinic Platform ("Atlas") is an appointment, clinic workflow and reminder system for clinics. This
        policy explains what information Atlas processes, why it is processed, the service providers involved, and
        the choices available to clinics, staff and patients.
      </p>

      <section style={sectionStyle}>
        <h2>Information we process</h2>
        <p>
          Depending on how a clinic uses Atlas, information may include clinic and staff account details; patient
          names and phone numbers; appointment date and time; assigned doctor; appointment status; reminder language
          and settings; and limited technical, security and audit information needed to operate and protect the service.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Account and sign-in information</h2>
        <p>
          Atlas may use email magic links, passkeys, Sign in with Apple or Google authentication when those options
          are enabled. An identity provider may return a stable account identifier and basic profile information such
          as name and email address. Apple users may choose Apple&apos;s private email relay. Atlas does not receive an
          Apple Account password, Google password, iCloud mailbox contents or Gmail contents through these sign-in flows.
          Passkey authentication is performed by the user&apos;s device or credential provider; Atlas does not receive the
          private passkey key material.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>How information is used</h2>
        <p>
          Atlas uses information to authenticate users; create and manage clinics and appointments; enforce clinic
          and doctor access boundaries; provide scheduling and queue tools; send or track appointment reminders when
          enabled; protect accounts and clinic data; troubleshoot the service; and maintain reliable operation.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>WhatsApp reminders</h2>
        <p>
          When a clinic enables WhatsApp reminders, relevant phone-number and appointment-reminder information may be
          transmitted through a configured WhatsApp Business provider, including the WhatsApp Business Platform
          operated by Meta. Atlas may also receive delivery-status events so the clinic can know whether a reminder
          was sent or delivered. Clinics are responsible for using messaging in accordance with applicable consent
          and messaging rules.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Service providers</h2>
        <p>
          Atlas relies on infrastructure and service providers only as needed to operate the platform. These may
          include Vercel for hosting, Supabase for database and authentication infrastructure, Apple or Google for an
          authentication option chosen by the user, and Meta/WhatsApp or another configured messaging provider for
          clinic reminders. Atlas does not sell clinic, staff or patient personal information. Providers that process
          personal information for Atlas are required to handle it under their applicable privacy, security and
          contractual obligations in a manner consistent with the protections described in this policy and applicable law.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Apple health data and device permissions</h2>
        <p>
          The current Atlas app does not request HealthKit, Clinical Health Records, Contacts, Photos, camera,
          microphone or location access for its core appointment workflow. Atlas does not store personal health
          information in iCloud. If a future Atlas feature needs a protected device permission, Atlas will request it
          only for a disclosed feature and update this policy where appropriate.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Data retention and deletion</h2>
        <p>
          Information is retained only as reasonably needed for clinic operations, security, record integrity and
          applicable obligations. Clinics control their appointment records within Atlas. Patients should normally
          direct access, correction or deletion requests to the clinic that collected their information. Signed-in
          Atlas account holders can permanently delete their Atlas account from <strong>Settings → Account &amp; deletion</strong>.
          A clinic owner must first transfer or delete owned clinics so a clinic workspace is not removed accidentally.
          See the <a href="/data-deletion" style={{ color: "#087a5b" }}>Data Deletion page</a> for details.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Security</h2>
        <p>
          Atlas uses access controls, tenant separation, encrypted network connections, authentication safeguards,
          and other technical and organizational measures designed to protect clinic and patient information. No
          online system can be guaranteed to be completely secure.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Your choices</h2>
        <p>
          Clinics can manage staff access and reminder settings. Account holders can delete their account in Atlas.
          Patients may ask their clinic to correct or remove information held for appointment purposes, subject to
          legitimate record-retention needs. Users may choose an available sign-in method and can remove Atlas access
          from an external identity provider using that provider&apos;s account controls.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Changes to this policy</h2>
        <p>
          This policy may be updated as Atlas develops. The effective date above will be updated when material changes
          are made.
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
