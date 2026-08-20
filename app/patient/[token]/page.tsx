import type { Metadata } from "next";
import { formatIraqiMobile } from "@/lib/appointments";
import { localizeDigits } from "@/lib/i18n/format";
import { hashPatientToken, isPatientToken } from "@/lib/patient-links";
import { getPatientEarlierSlotPreference } from "@/lib/smart-fill/patient-preference";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateEarlierSlotPreference, updatePatientAppointment } from "./actions";

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
  doctor_specialty: string | null;
  receptionist_phone: string | null;
  appointment_at: string;
  appointment_status: string;
  reminder_language: string;
  token_expires_at: string;
  queue_position: number | null;
  appointments_ahead: number | null;
};

type PatientLocale = "ku" | "bd" | "ar" | "en";

const patientCopy = {
  en: {
    lang: "en",
    dir: "ltr" as const,
    dateLocale: "en-IQ",
    eyebrow: "Your appointment",
    doctor: "Doctor",
    specialty: "Specialty",
    contact: "Reception contact",
    dateTime: "Date & time",
    am: "AM",
    pm: "PM",
    order: "Your order today",
    first: "You’re first for this doctor.",
    ahead: "patient ahead of you",
    aheadMany: "patients ahead of you",
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
    earlierTitle: "Want an earlier appointment?",
    earlierHelp: "Join the earlier-slot list. If a suitable cancellation opens, reception can offer it to you.",
    earlierJoin: "Yes, offer me an earlier time",
    earlierJoined: "You’re on the earlier-slot list.",
    earlierLeave: "Leave earlier-slot list",
    privacy: "This page is private to this appointment.",
  },
  ku: {
    lang: "ckb",
    dir: "rtl" as const,
    dateLocale: "ckb-IQ",
    eyebrow: "کاتەکەت",
    doctor: "پزیشک",
    specialty: "پسپۆڕی",
    contact: "ژمارەی ڕیسێپشن",
    dateTime: "ڕێکەوت و کات",
    am: "پێش نیوەڕۆ",
    pm: "دوای نیوەڕۆ",
    order: "ڕیزت بۆ ئەمڕۆ",
    first: "تۆ یەکەم نەخۆشیت بۆ ئەم پزیشکە.",
    ahead: "نەخۆش لە پێشتە",
    aheadMany: "نەخۆش لە پێشتە",
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
    earlierTitle: "مەوعیدی زووتر دەوێت؟",
    earlierHelp: "لە لیستی مەوعیدی زووتر دابنێ. ئەگەر مەوعیدێکی گونجاو بەتاڵ بوو، ڕیسێپشن دەتوانێت پێشنیارت پێ بکات.",
    earlierJoin: "بەڵێ، مەوعیدی زووترم پێشنیار بکە",
    earlierJoined: "تۆ لە لیستی مەوعیدی زووتریت.",
    earlierLeave: "لە لیستی زووتر دەرچم",
    privacy: "ئەم پەڕەیە تەنها بۆ ئەم کاتەیە.",
  },
  bd: {
    lang: "ku",
    dir: "rtl" as const,
    dateLocale: "ckb-IQ",
    eyebrow: "وادەیا تە",
    doctor: "دکتۆر",
    specialty: "تایبەتمەندی",
    contact: "ژمارا ڕیسێپشنێ",
    dateTime: "ڕێکەفت و کات",
    am: "بەری نیڤرۆ",
    pm: "پشتی نیڤرۆ",
    order: "ڕێزا تە یا ئەڤرۆ",
    first: "تو یێ ئێکێ ی بۆ ڤی دکتۆری.",
    ahead: "نەخۆش بەری تەیە",
    aheadMany: "نەخۆش بەری تە نە",
    confirmTitle: "وادەیا خۆ پشتڕاست بکە",
    confirmInitial: "وادەیێ پشتڕاست بکە",
    cancelSmall: "دخوازیت هەلوەشێنیت؟",
    question: "تو دێی؟",
    confirm: "بەلێ، دێم",
    cancel: "نەخێر، هەلوەشێنە",
    confirmed: "پشتڕاست بوو. چاڤەڕێیا تە دکەین.",
    cancelled: "وادەیا تە هاتە هەلوەشاندن.",
    completed: "وادەیا تە تەمام بوو.",
    noShow: "دەمێ وادەیا تە دەرباز بوو.",
    changeMind: "نەشێم بهێم",
    earlierTitle: "مەوعیدەکا زووتر دخوازیت؟",
    earlierHelp: "خۆ بخە لیستا مەوعیدێن زووتر. ئەگەر مەوعیدەکا گونجای هاتە هەلوەشاندن، ڕیسێپشن دشێت پێشنیارا وێ بۆ تە بکەت.",
    earlierJoin: "بەلێ، مەوعیدەکا زووتر بۆ من پێشنیار بکە",
    earlierJoined: "تو د لیستا مەوعیدێن زووتر دای.",
    earlierLeave: "ژ لیستا زووتر دەربکەڤم",
    privacy: "ئەڤ پەرە تەنێ بۆ ڤێ وادەیێیە.",
  },
  ar: {
    lang: "ar-IQ",
    dir: "rtl" as const,
    dateLocale: "ar-IQ",
    eyebrow: "موعدك",
    doctor: "الدكتور",
    specialty: "الاختصاص",
    contact: "رقم السكرتير",
    dateTime: "التاريخ والوقت",
    am: "صباحاً",
    pm: "مساءً",
    order: "ترتيبك اليوم",
    first: "إنت أول واحد عند هذا الدكتور.",
    ahead: "مريض قبلك",
    aheadMany: "مرضى قبلك",
    confirmTitle: "أكد موعدك",
    confirmInitial: "أكد الموعد",
    cancelSmall: "تريد تلغي الموعد؟",
    question: "راح تجي؟",
    confirm: "إي، راح أجي",
    cancel: "لا، ألغي الموعد",
    confirmed: "تم التأكيد. ننتظرك.",
    cancelled: "هذا الموعد ملغي.",
    completed: "هذا الموعد خلص.",
    noShow: "وقت هذا الموعد انتهى.",
    changeMind: "ما أگدر أجي",
    earlierTitle: "تريد موعد أبكر؟",
    earlierHelp: "انضم لقائمة المواعيد الأبكر. إذا انلغى موعد مناسب، السكرتير يگدر يعرضه عليك.",
    earlierJoin: "إي، عرضوا عليّ موعد أبكر",
    earlierJoined: "إنت بقائمة المواعيد الأبكر.",
    earlierLeave: "شيلوني من قائمة الأبكر",
    privacy: "هاي الصفحة خاصة بهذا الموعد بس.",
  },
} as const;

function patientLocale(value: string): PatientLocale {
  return value === "ku" || value === "bd" || value === "ar" ? value : "en";
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function baghdadClock(date: Date, locale: PatientLocale) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour24 = Number(values.hour ?? 0);
  const minute = Number(values.minute ?? 0);
  const hour12 = hour24 % 12 || 12;
  return {
    clock: `${localizeDigits(hour12, locale)}:${localizeDigits(pad(minute), locale)}`,
    period: hour24 >= 12 ? patientCopy[locale].pm : patientCopy[locale].am,
  };
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
  const time = baghdadClock(appointmentDate, locale);
  const status = appointment.appointment_status;
  const isPending = status === "pending";
  const isConfirmed = status === "confirmed";
  const isActive = isPending || isConfirmed;
  const reminderView = query.view === "reminder";
  const ahead = appointment.appointments_ahead ?? 0;
  const receptionPhone = appointment.receptionist_phone ? formatIraqiMobile(appointment.receptionist_phone) : null;
  let wantsEarlierSlot = false;
  if (isActive) {
    const { enabled } = await getPatientEarlierSlotPreference(admin, tokenHash);
    wantsEarlierSlot = enabled;
  }
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
        <div className="eyebrow patient-eyebrow">{text.eyebrow}</div>
        <h1 className="patient-clinic-name">{appointment.clinic_name}</h1>

        <div className="patient-time-card">
          <span className="patient-time-label">{text.dateTime}</span>
          <strong className="patient-date-value">{dateText}</strong>
          <div className="patient-time-value">
            <bdi dir="ltr">{time.clock}</bdi>
            <span>{time.period}</span>
          </div>
        </div>

        <section className="patient-doctor-card" aria-label={text.doctor}>
          <div className="patient-detail-block">
            <span>{text.doctor}</span>
            <strong>{appointment.doctor_name}</strong>
          </div>
          {appointment.doctor_specialty ? (
            <div className="patient-detail-block">
              <span>{text.specialty}</span>
              <strong className="patient-detail-secondary">{appointment.doctor_specialty}</strong>
            </div>
          ) : null}
          {receptionPhone ? (
            <div className="patient-detail-block patient-contact-block">
              <span>{text.contact}</span>
              <a href={`tel:${appointment.receptionist_phone}`} dir="ltr">{receptionPhone}</a>
            </div>
          ) : null}
        </section>

        {isActive && appointment.queue_position ? (
          <div className="patient-order-card" aria-label={`${text.order} ${appointment.queue_position}`}>
            <div><span>{text.order}</span><strong>#{appointment.queue_position}</strong></div>
            <p>{ahead === 0 ? text.first : `${ahead} ${ahead === 1 ? text.ahead : text.aheadMany}.`}</p>
          </div>
        ) : null}

        {isActive ? (
          <section className={`patient-earlier-card ${wantsEarlierSlot ? "is-active" : ""}`}>
            <strong>{text.earlierTitle}</strong>
            <p>{wantsEarlierSlot ? text.earlierJoined : text.earlierHelp}</p>
            <form action={updateEarlierSlotPreference.bind(null, token, !wantsEarlierSlot)}>
              <button className={wantsEarlierSlot ? "patient-earlier-leave" : "button button-ghost patient-earlier-join"} type="submit">
                {wantsEarlierSlot ? text.earlierLeave : text.earlierJoin}
              </button>
            </form>
          </section>
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
          .patient-card { width: min(100%, 610px); padding: clamp(24px,5vw,38px); }
          .patient-eyebrow { margin-top: 20px; }
          .patient-clinic-name { margin: 8px 0 24px; font-size: clamp(30px,7vw,42px); line-height: 1.08; }
          .patient-time-card { margin: 0 0 22px; border: 1px solid #cfe7dd; border-radius: 20px; padding: clamp(20px,4vw,28px); background: linear-gradient(145deg,#f5fcf9,#edf8f3); }
          .patient-time-label { display: block; margin-bottom: 13px; color: var(--muted); font-size: 11px; font-weight: 820; letter-spacing: .08em; text-transform: uppercase; }
          .patient-date-value { display: block; max-width: 100%; color: var(--ink); font-size: clamp(21px,5vw,29px); line-height: 1.5; text-wrap: balance; }
          .patient-time-value { display: flex; align-items: baseline; gap: 11px; flex-wrap: wrap; margin-top: 18px; color: var(--accent); }
          .patient-time-value bdi { direction: ltr; font-size: clamp(34px,8vw,48px); font-weight: 900; line-height: 1; font-variant-numeric: tabular-nums; letter-spacing: .01em; }
          .patient-time-value span { font-size: clamp(16px,4vw,21px); font-weight: 820; }
          .patient-doctor-card { display: grid; gap: 0; margin: 0 0 22px; border: 1px solid var(--line); border-radius: 18px; overflow: hidden; background: #fff; }
          .patient-detail-block { display: grid; gap: 7px; padding: 17px 19px; }
          .patient-detail-block + .patient-detail-block { border-top: 1px solid var(--line); }
          .patient-detail-block > span { color: var(--muted); font-size: 10px; font-weight: 820; letter-spacing: .06em; text-transform: uppercase; }
          .patient-detail-block > strong { color: var(--ink); font-size: clamp(24px,6vw,32px); line-height: 1.25; }
          .patient-detail-block > .patient-detail-secondary { font-size: clamp(17px,4vw,21px); font-weight: 790; }
          .patient-contact-block a { width: fit-content; color: var(--accent); font-size: clamp(19px,4.5vw,24px); font-weight: 850; text-decoration: none; }
          .patient-order-card { margin: 0 0 22px; border: 1px solid #cfe7dd; border-radius: 17px; padding: 17px 19px; background: #effaf6; }
          .patient-order-card > div { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
          .patient-order-card span { color: var(--muted); font-size: 12px; font-weight: 780; }
          .patient-order-card strong { color: var(--accent); font-size: 30px; line-height: 1; }
          .patient-order-card p { margin: 10px 0 0; color: var(--ink-soft); font-size: 14px; line-height: 1.55; }
          .patient-earlier-card { margin: 0 0 22px; border: 1px solid var(--line); border-radius: 17px; padding: 17px 19px; background: #fff; }
          .patient-earlier-card.is-active { border-color: #b9dfd1; background: #f3fbf8; }
          .patient-earlier-card > strong { display: block; color: var(--ink); font-size: 16px; }
          .patient-earlier-card > p { margin: 8px 0 14px; color: var(--ink-soft); font-size: 13px; line-height: 1.55; }
          .patient-earlier-join { width: 100%; min-height: 48px; }
          .patient-earlier-leave { border: 0; padding: 5px 0; background: transparent; color: var(--muted); font-size: 12px; font-weight: 720; text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
          .patient-initial-response, .patient-response-block { margin-top: 12px; }
          .patient-initial-response h2, .patient-response-block h2 { margin: 0 0 14px; font-size: clamp(22px,5vw,28px); letter-spacing: -.02em; }
          .patient-confirm-primary { width: 100%; min-height: 54px; font-size: 16px; }
          .patient-actions .button { min-height: 54px; }
          .patient-cancel-small { float: inline-end; margin-top: 12px; border: 0; padding: 7px 2px; background: transparent; color: var(--muted); font-size: 12px; font-weight: 720; text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
          .patient-status-message { clear: both; margin-top: 22px; border-radius: 16px; padding: 18px; background: var(--surface-soft); color: var(--ink-soft); font-size: 15px; line-height: 1.55; }
          .patient-status-message.is-confirmed { background: var(--success-bg); color: var(--success); }
          .patient-change-mind { margin-top: 12px; border: 0; padding: 5px 0; background: transparent; color: var(--muted); font: inherit; font-size: 12px; font-weight: 720; text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
          .patient-privacy { clear: both; padding-top: 14px; }
          .patient-card button, .patient-card a { -webkit-tap-highlight-color: rgba(8,119,90,.15); }
          .patient-card button { transition: transform .1s ease, box-shadow .12s ease, filter .12s ease; }
          .patient-card button:active { transform: scale(.985); filter: brightness(.97); }
          .patient-card button:focus-visible, .patient-card a:focus-visible { outline: 3px solid rgba(8,119,90,.28); outline-offset: 3px; }
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
