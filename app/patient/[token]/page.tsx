import type { Metadata } from "next";
import { hashPatientToken, isPatientToken } from "@/lib/patient-links";
import { createAdminClient } from "@/lib/supabase/admin";
import { updatePatientAppointment } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Appointment — Atlas",
  robots: { index: false, follow: false },
};

type PatientPageProps = {
  params: Promise<{ token: string }>;
};

type PatientAppointment = {
  clinic_name: string;
  doctor_name: string;
  appointment_at: string;
  appointment_status: string;
  reminder_language: string;
  token_expires_at: string;
};

type PatientLocale = "ku" | "ar" | "en";

const patientCopy = {
  en: {
    lang: "en",
    dir: "ltr" as const,
    dateLocale: "en-IQ",
    eyebrow: "Your appointment",
    doctor: "Doctor",
    dateTime: "Date & time",
    question: "Will you come?",
    confirm: "Yes, I’m coming",
    cancel: "No, cancel it",
    confirmed: "Confirmed. We’ll be expecting you.",
    cancelled: "This appointment is cancelled.",
    completed: "This appointment is complete.",
    noShow: "This appointment has ended.",
    changeMind: "I can’t come",
    privacy: "This page is only for this appointment.",
  },
  ku: {
    lang: "ckb",
    dir: "rtl" as const,
    dateLocale: "ckb-IQ",
    eyebrow: "کاتەکەت",
    doctor: "پزیشک",
    dateTime: "ڕێکەوت و کات",
    question: "دێیت؟",
    confirm: "بەڵێ، دێم",
    cancel: "نەخێر، هەڵیوەشێنەوە",
    confirmed: "پشتڕاست کرا. چاوەڕێت دەکەین.",
    cancelled: "کاتەکەت هەڵوەشێنرایەوە.",
    completed: "کاتەکەت تەواو بوو.",
    noShow: "کاتەکەت تێپەڕی.",
    changeMind: "ناتوانم بێم",
    privacy: "ئەم پەڕەیە تەنها بۆ ئەم کاتەیە.",
  },
  ar: {
    lang: "ar",
    dir: "rtl" as const,
    dateLocale: "ar-IQ",
    eyebrow: "موعدك",
    doctor: "الطبيب",
    dateTime: "التاريخ والوقت",
    question: "هل ستأتي؟",
    confirm: "نعم، سأأتي",
    cancel: "لا، ألغِ الموعد",
    confirmed: "تم التأكيد. سنكون بانتظارك.",
    cancelled: "تم إلغاء هذا الموعد.",
    completed: "تم إكمال هذا الموعد.",
    noShow: "انتهى وقت هذا الموعد.",
    changeMind: "لن أستطيع الحضور",
    privacy: "هذه الصفحة لهذا الموعد فقط.",
  },
} as const;

function patientLocale(value: string): PatientLocale {
  return value === "ku" || value === "ar" ? value : "en";
}

export default async function PatientAppointmentPage({ params }: PatientPageProps) {
  const { token } = await params;
  if (!isPatientToken(token)) return <Unavailable />;

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return <Unavailable />;
  }

  const tokenHash = hashPatientToken(token);
  const bucketHash = hashPatientToken(`patient-view:${token}`);
  const { data: allowed, error: limitError } = await admin.rpc(
    "consume_patient_link_rate_limit",
    { p_bucket_hash: bucketHash },
  );
  if (limitError || allowed !== true) return <Unavailable />;

  const { data, error } = await admin.rpc("get_patient_appointment", {
    p_token_hash: tokenHash,
  });
  const appointment = Array.isArray(data) ? data[0] as PatientAppointment | undefined : undefined;
  if (error || !appointment) return <Unavailable />;

  const locale = patientLocale(appointment.reminder_language);
  const text = patientCopy[locale];
  const dateTime = new Intl.DateTimeFormat(text.dateLocale, {
    timeZone: "Asia/Baghdad",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(appointment.appointment_at));
  const status = appointment.appointment_status;
  const isPending = status === "pending";
  const isConfirmed = status === "confirmed";
  const statusMessage = isConfirmed
    ? text.confirmed
    : status === "cancelled"
      ? text.cancelled
      : status === "completed"
        ? text.completed
        : status === "no_show"
          ? text.noShow
          : null;

  return (
    <main className="center-page patient-page">
      <section className="auth-card patient-card" lang={text.lang} dir={text.dir}>
        <a className="app-brand" href="/">
          <span className="app-brand-mark" aria-hidden="true">A</span>
          <span className="app-brand-word">Atlas</span>
        </a>
        <div className="eyebrow">{text.eyebrow}</div>
        <h1>{appointment.clinic_name}</h1>

        <dl className="appointment-details patient-appointment-details">
          <div><dt>{text.doctor}</dt><dd>{appointment.doctor_name}</dd></div>
          <div><dt>{text.dateTime}</dt><dd>{dateTime}</dd></div>
        </dl>

        {isPending ? (
          <div className="patient-response-block">
            <h2>{text.question}</h2>
            <div className="patient-actions" aria-label="Patient appointment response">
              <form action={updatePatientAppointment.bind(null, token, "confirmed")}>
                <button className="button" type="submit">{text.confirm}</button>
              </form>
              <form action={updatePatientAppointment.bind(null, token, "cancelled")}>
                <button className="button button-ghost" type="submit">{text.cancel}</button>
              </form>
            </div>
          </div>
        ) : null}

        {statusMessage ? (
          <div className={`patient-status-message ${isConfirmed ? "is-confirmed" : ""}`} role="status">
            <strong>{statusMessage}</strong>
            {isConfirmed ? (
              <form action={updatePatientAppointment.bind(null, token, "cancelled")}>
                <button className="patient-change-mind" type="submit">{text.changeMind}</button>
              </form>
            ) : null}
          </div>
        ) : null}

        <p className="quiet patient-privacy">{text.privacy}</p>

        <style>{`
          .patient-response-block { margin-top: 8px; }
          .patient-response-block h2 { margin: 0 0 12px; font-size: 22px; letter-spacing: -.02em; }
          .patient-status-message { margin-top: 8px; border-radius: 14px; padding: 15px; background: var(--surface-soft); color: var(--ink-soft); line-height: 1.5; }
          .patient-status-message.is-confirmed { background: var(--success-bg); color: var(--success); }
          .patient-change-mind { margin-top: 10px; border: 0; padding: 3px 0; background: transparent; color: var(--muted); font: inherit; font-size: 12px; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
        `}</style>
      </section>
    </main>
  );
}

function Unavailable() {
  return (
    <main className="center-page patient-page">
      <section className="auth-card">
        <a className="app-brand" href="/">
          <span className="app-brand-mark" aria-hidden="true">A</span>
          <span className="app-brand-word">Atlas</span>
        </a>
        <div className="eyebrow">Private appointment link</div>
        <h1>This link is unavailable.</h1>
        <p className="quiet">It may be invalid, expired, replaced, or temporarily rate-limited. Contact the clinic for a new link.</p>
      </section>
    </main>
  );
}
