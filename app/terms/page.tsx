import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Atlas",
  description: "Terms of service for Atlas Clinic Platform.",
};

const sectionStyle = { marginTop: "28px" } as const;

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px 72px", color: "#10251f", lineHeight: 1.7 }}>
      <a href="/" style={{ color: "#087a5b", textDecoration: "none", fontWeight: 700 }}>← Atlas</a>
      <h1 style={{ fontSize: 38, lineHeight: 1.15, margin: "20px 0 8px" }}>Terms of Service</h1>
      <p style={{ marginTop: 0, color: "#5f6f69" }}>Effective: 18 August 2026</p>

      <p>
        These terms govern use of Atlas Clinic Platform ("Atlas"), an appointment and reminder tool for clinics.
      </p>

      <section style={sectionStyle}>
        <h2>Clinic scheduling tool</h2>
        <p>
          Atlas helps clinics organize appointments, staff access, and reminders. Atlas is not a medical device,
          does not provide medical advice, and is not an emergency service.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Clinic responsibilities</h2>
        <p>
          Clinics are responsible for the accuracy of information entered into Atlas, appropriate staff access,
          lawful handling of patient information, and obtaining any consent required for communications such as
          WhatsApp reminders.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Acceptable use</h2>
        <p>
          Atlas must not be used to violate law, misuse personal information, interfere with the service, attempt
          unauthorized access, or send unlawful or abusive communications.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Third-party services</h2>
        <p>
          Some Atlas functions depend on third-party providers such as hosting, database, authentication, and
          messaging services. Their availability and rules may affect corresponding Atlas features.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Availability and changes</h2>
        <p>
          Atlas may be updated, improved, suspended, or changed as the product develops. Reasonable efforts are
          made to provide a reliable service, but uninterrupted availability is not guaranteed.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Privacy</h2>
        <p>
          Use of Atlas is also subject to the <a href="/privacy" style={{ color: "#087a5b" }}>Privacy Policy</a>.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Contact</h2>
        <p>
          Questions about these terms may be sent to <a href="mailto:niazsarbastahmad2002@gmail.com" style={{ color: "#087a5b" }}>niazsarbastahmad2002@gmail.com</a>.
        </p>
      </section>
    </main>
  );
}
