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
  searchParams: Promise<{ view?: string }>;
};

type PatientAppointment = {
  clinic_name: string;
  doctor_name: string;
  appointment_at: string;
  appointment_status: string;
  reminder_language: string;
  token_expires_at: string;
  queue_position: number | null;
  appointments_ahead: number | null;
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
    order: "Your order today",
    first: "You’re first for this doctor.",
    ahead: "appointment before yours",
    aheadMany: "appointments before yours",
    confirmTitle: "Confirm your appointment",
    confirmInitial: "Confirm appointment",
    cancelSmall: "Need to cancel?",
    question: "Will you come?",
    confirm: "Yes, I’m coming",
    cancel: "No, cancel it",
    confirmed: "Confirmed. We’ll be expecting you.",
    cancelled: "This appointment is cancelled.",
    completed: "This appointment is complete.",
    noShow: "This appointment has ended.",
    changeMind: "I can’t come",
    privacy: "This page is private to this appointment.",
  },
  ku: {
    lang: "ckb",
    dir: "rtl" as const,
    dateLocale: "ckb-IQ",
    eyebrow: "کاتەکەت",
    doctor: "پزیشک",
    dateTime: "ڕێکەوت و کات",
    order: "ڕیزت بۆ ئەمڕۆ",
    first: "تۆ یەکەم کەسیت بۆ ئەم پزیشکە.",
    ahead: "وادە پێش تۆیە",
    aheadMany: "وادە پێش تۆیە",
    confirmTitle: "کاتەکەت پشتڕاست بکەرەوە",
    confirmInitial: "پشتڕاستکردنەوەی کات",
    cancelSmall: "دەتەوێت هەڵیوەشێنیتەوە؟",
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
    order: "ترتيبك اليوم",
    first: "أنت الأول عند هذا الطبيب.",
    ahead: "موعد قبلك",
    aheadMany: "مواعيد قبلك",
    confirmTitle: "أكد موعدك",
    confirmInitial: "تأكيد الموعد",
    cancelSmall: "تحتاج إلى الإلغاء؟",
    question: "هل ستأتي؟",
    confirm: "نعم، سأأتي",
    cancel: "لا، ألغِ الموعد",
    confirmed: "تم التأكيد. سنكون بانتظارك.",
    cancelled: "تم إلغاء هذا الموعد.",
    completed: "تم إكمال هذا الموعد.",
    noShow: "انتهى وقت هذا الموعد.",
    changeMind: "لن أستطيع الحضور",
    privacy: "هذه الصفحة خاصة بهذا الموعد فقط.",
  },
} as const;

function patientLocale(value: string): PatientLocale {
  return value === "ku" || value === "ar" ? value : "en";
}

export default async function PatientAppointmentPage({ params, searchParams }: PatientPageProps) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
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
  const appointmentDate = new Date(appointment.appointment_at);
  const dateText = new Intl.DateTimeFormat(text.dateLocale, {
    timeZone: "Asia/Baghdad",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(appointmentDate);
  const timeText = new Intl.DateTimeFormat(text.dateLocale, {
    timeZone: "Asia/Baghdad",
    hour: "numeric",
    minute: "2-digit",
  }).format(appointmentDate);
  const status = appointment.appointment_status;
  const isPending = status === "pending";
  const isConfirmed = status === "confirmed";
  const isActive = isPending || isConfirmed;
  const reminderView = query.view === "reminder";
  const ahead = appointment.appointments_ahead ?? 0;
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

        <div className="patient-time-card">
          <span>{text.dateTime}</span>
          <strong>{dateText}</strong>
          <bdi>{timeText}</bdi>
        </div>

        <dl className="appointment-details patient-appointment-details">
          <div><dt>{text.doctor}</dt><dd>{appointment.doctor_name}</dd></div>
        </dl>

        {isActive && appointment.queue_position ? (
          <div className="patient-order-card" aria-label={`${text.order} ${appointment.queue_position}`}>
            <div><span>{text.order}</span><strong>#{appointment.queue_position}</strong></div>
            <p>{ahead === 0 ? text.first : `${ahead} ${ahead === 1 ? text.ahead : text.aheadMany}.`}</p>
          </div>
        ) : null}

        {isPending && !reminderView ? (
          <div className="patient-initial-response">
            <h2>{text.confirmTitle}</h2>
            <form action={updatePatientAppointment.bind(null, token, "confirmed")}>
              <button className="button patient-confirm-primary" type="submit">{text.confirmInitial}</button>
            </form>
            <form action={updatePatientAppointment.bind(null, token, "cancelled")}>
              <button className="patient-cancel-small" type="submit">{text.cancelSmall}</button>
            </form>
          </div>
        ) : null}

        {isPending && reminderView ? (
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
          .patient-time-card { margin: 2px 0 14px; border: 1px solid #cfe7dd; border-radius: 17px; padding: 15px 17px; background: linear-gradient(145deg,#f5fcf9,#edf8f3); }
          .patient-time-card > span { display: block; margin-bottom: 7px; color: var(--muted); font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
          .patient-time-card strong { display: block; color: var(--ink); font-size: 18px; line-height: 1.35; }
          .patient-time-card bdi { display: block; margin-top: 6px; color: var(--accent); direction: ltr; font-size: 28px; font-weight: 880; line-height: 1; font-variant-numeric: tabular-nums; }
          .patient-appointment-details { grid-template-columns: 1fr; margin-bottom: 14px; }
          .patient-order-card { margin: 0 0 16px; border: 1px solid #cfe7dd; border-radius: 15px; padding: 13px 15px; background: #effaf6; }
          .patient-order-card > div { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
          .patient-order-card span { color: var(--muted); font-size: 11px; font-weight: 760; }
          .patient-order-card strong { color: var(--accent); font-size: 24px; line-height: 1; }
          .patient-order-card p { margin: 7px 0 0; color: var(--ink-soft); font-size: 12px; line-height: 1.45; }
          .patient-initial-response, .patient-response-block { margin-top: 8px; }
          .patient-initial-response h2, .patient-response-block h2 { margin: 0 0 12px; font-size: 22px; letter-spacing: -.02em; }
          .patient-confirm-primary { width: 100%; min-height: 48px; }
          .patient-cancel-small { float: inline-end; margin-top: 10px; border: 0; padding: 4px 0; background: transparent; color: var(--muted); font-size: 11px; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
          .patient-status-message { clear: both; margin-top: 18px; border-radius: 14px; padding: 15px; background: var(--surface-soft); color: var(--ink-soft); line-height: 1.5; }
          .patient-status-message.is-confirmed { background: var(--success-bg); color: var(--success); }
          .patient-change-mind { margin-top: 10px; border: 0; padding: 3px 0; background: transparent; color: var(--muted); font: inherit; font-size: 12px; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
          .patient-privacy { clear: both; padding-top: 10px; }
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
