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
    status: "Status",
    reminderLanguage: "Reminder language",
    pending: "Pending confirmation",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    completed: "Completed",
    noShow: "No-show",
    language: "English",
    confirm: "Confirm appointment",
    cancel: "Cancel appointment",
    privacy: "This private link only shows this appointment. It does not provide access to the clinic schedule.",
  },
  ku: {
    lang: "ckb",
    dir: "rtl" as const,
    dateLocale: "ckb-IQ",
    eyebrow: "وادەکەت",
    doctor: "پزیشک",
    dateTime: "بەروار و کات",
    status: "دۆخ",
    reminderLanguage: "زمانی بیرخستنەوە",
    pending: "چاوەڕوانی پشتڕاستکردنەوە",
    confirmed: "پشتڕاستکراوە",
    cancelled: "هەڵوەشێنراوە",
    completed: "تەواوبوو",
    noShow: "نەهات",
    language: "کوردی (سۆرانی)",
    confirm: "وادەکە پشتڕاست بکەرەوە",
    cancel: "وادەکە هەڵبوەشێنەرەوە",
    privacy: "ئەم بەستەرە تایبەتە تەنها ئەم وادەیە نیشان دەدات و دەستگەیشتن بە خشتەی کلینیک نادات.",
  },
  ar: {
    lang: "ar",
    dir: "rtl" as const,
    dateLocale: "ar-IQ",
    eyebrow: "موعدك",
    doctor: "الطبيب",
    dateTime: "التاريخ والوقت",
    status: "الحالة",
    reminderLanguage: "لغة التذكير",
    pending: "بانتظار التأكيد",
    confirmed: "مؤكد",
    cancelled: "ملغي",
    completed: "مكتمل",
    noShow: "لم يحضر",
    language: "العربية",
    confirm: "تأكيد الموعد",
    cancel: "إلغاء الموعد",
    privacy: "هذا الرابط الخاص يعرض هذا الموعد فقط ولا يتيح الوصول إلى جدول العيادة.",
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
  const statusLabels: Record<string, string> = {
    pending: text.pending,
    confirmed: text.confirmed,
    cancelled: text.cancelled,
    completed: text.completed,
    no_show: text.noShow,
  };
  const languageLabels: Record<string, string> = {
    ku: patientCopy.ku.language,
    ar: patientCopy.ar.language,
    en: patientCopy.en.language,
  };
  const dateTime = new Intl.DateTimeFormat(text.dateLocale, {
    timeZone: "Asia/Baghdad",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(appointment.appointment_at));
  const canConfirm = appointment.appointment_status === "pending";
  const canCancel = ["pending", "confirmed"].includes(appointment.appointment_status);

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
          <div><dt>{text.status}</dt><dd>{statusLabels[appointment.appointment_status] ?? appointment.appointment_status}</dd></div>
          <div><dt>{text.reminderLanguage}</dt><dd>{languageLabels[appointment.reminder_language] ?? appointment.reminder_language}</dd></div>
        </dl>

        {canConfirm || canCancel ? (
          <div className="patient-actions" aria-label="Patient appointment actions">
            {canConfirm ? (
              <form action={updatePatientAppointment.bind(null, token, "confirmed")}>
                <button className="button" type="submit">{text.confirm}</button>
              </form>
            ) : null}
            {canCancel ? (
              <form action={updatePatientAppointment.bind(null, token, "cancelled")}>
                <button className="button button-ghost" type="submit">{text.cancel}</button>
              </form>
            ) : null}
          </div>
        ) : null}

        <p className="quiet patient-privacy">{text.privacy}</p>
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
