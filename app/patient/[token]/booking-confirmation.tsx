import Link from "next/link";
import { AtlasPatientNav } from "@/app/care/patient-nav";
import { uiLocaleMeta, type UiLocale } from "@/lib/i18n/ui";

type ConfirmationStatus = "pending" | "confirmed";

type Props = {
  locale: UiLocale;
  token: string;
  accountMarker: string;
  status: ConfirmationStatus;
  clinicName: string;
  doctorName: string;
  dateLabel: string;
  timeLabel: string;
  navLabel: string;
  navHref: string;
};

const copy: Record<UiLocale, {
  eyebrow: string;
  confirmedTitle: string;
  pendingTitle: string;
  confirmedHelp: string;
  pendingHelp: string;
  confirmedStatus: string;
  pendingStatus: string;
  doctor: string;
  clinic: string;
  date: string;
  time: string;
  status: string;
  details: string;
  myAppointments: string;
  privateNote: string;
  language: string;
}> = {
  en: {
    eyebrow: "Your appointment",
    confirmedTitle: "Appointment confirmed",
    pendingTitle: "Appointment request received",
    confirmedHelp: "Your appointment is confirmed. Check the details below before your visit.",
    pendingHelp: "This appointment is not confirmed yet. Open the appointment details to review or confirm it.",
    confirmedStatus: "Confirmed",
    pendingStatus: "Needs confirmation",
    doctor: "Doctor", clinic: "Clinic", date: "Date", time: "Time", status: "Current status",
    details: "View appointment details", myAppointments: "My appointments",
    privateNote: "These details come from your private appointment record.",
    language: "Language",
  },
  ku: {
    eyebrow: "مەوعیدەکەت",
    confirmedTitle: "مەوعیدەکەت پشتڕاست کراوەتەوە",
    pendingTitle: "داواکاری مەوعیدەکەت وەرگیرا",
    confirmedHelp: "مەوعیدەکەت پشتڕاست کراوەتەوە. پێش سەردان وردەکارییەکان بپشکنە.",
    pendingHelp: "ئەم مەوعیدە هێشتا پشتڕاست نەکراوەتەوە. وردەکارییەکان بکەرەوە بۆ بینین یان پشتڕاستکردنەوەی.",
    confirmedStatus: "پشتڕاستکراو", pendingStatus: "پێویستی بە پشتڕاستکردنەوە هەیە",
    doctor: "پزیشک", clinic: "کلینیک", date: "ڕێکەوت", time: "کات", status: "دۆخی ئێستا",
    details: "وردەکارییەکانی مەوعید ببینە", myAppointments: "مەوعیدەکانم",
    privateNote: "ئەم زانیارییانە لە تۆماری تایبەتی مەوعیدەکەتەوە وەرگیراون.",
    language: "زمان",
  },
  bd: {
    eyebrow: "وادەیا تە",
    confirmedTitle: "وادەیا تە هاتە پشتڕاستکرن",
    pendingTitle: "داخوازا وادەیێ هاتە وەرگرتن",
    confirmedHelp: "وادەیا تە هاتە پشتڕاستکرن. بەری سەردانێ وردەکاریان بپشکنە.",
    pendingHelp: "ئەڤ وادەیە هێشتا نەهاتییە پشتڕاستکرن. وردەکاریان ڤەکە بۆ دیتن یان پشتڕاستکرنا وێ.",
    confirmedStatus: "پشتڕاستکری", pendingStatus: "پێدڤی ب پشتڕاستکرنێ هەیە",
    doctor: "دکتۆر", clinic: "کلینیک", date: "ڕێکەفت", time: "دەم", status: "دۆخێ نوکە",
    details: "وردەکاریێن وادەیێ ببینە", myAppointments: "وادەیێن من",
    privateNote: "ئەڤ زانیاریە ژ تۆمارا تایبەتا وادەیا تە هاتینە وەرگرتن.",
    language: "زمان",
  },
  ar: {
    eyebrow: "موعدك",
    confirmedTitle: "تم تأكيد موعدك",
    pendingTitle: "استلمنا طلب الموعد",
    confirmedHelp: "موعدك مؤكد. راجع التفاصيل أدناه قبل الزيارة.",
    pendingHelp: "هذا الموعد بعده مو مؤكد. افتح تفاصيل الموعد حتى تراجعه أو تأكده.",
    confirmedStatus: "مؤكد", pendingStatus: "يحتاج تأكيد",
    doctor: "الطبيب", clinic: "العيادة", date: "التاريخ", time: "الوقت", status: "الحالة الحالية",
    details: "عرض تفاصيل الموعد", myAppointments: "مواعيدي",
    privateNote: "هاي التفاصيل مأخوذة من سجل موعدك الخاص.",
    language: "اللغة",
  },
};

const languageOptions = [
  { locale: "ku", label: "سۆرانی", lang: "ckb", dir: "rtl" },
  { locale: "bd", label: "بادینی", lang: "ku", dir: "rtl" },
  { locale: "ar", label: "العربية", lang: "ar", dir: "rtl" },
  { locale: "en", label: "English", lang: "en", dir: "ltr" },
] as const;

function privateHref(token: string, locale: UiLocale, accountMarker: string, confirmation: boolean) {
  const params = new URLSearchParams({ lang: locale });
  if (confirmation) params.set("view", "confirmation");
  if (accountMarker) params.set("account", accountMarker);
  return `/patient/${token}?${params.toString()}`;
}

/**
 * Only render with appointment data returned by get_patient_appointment after
 * validating the private link and rate limit in page.tsx. Never accept booking
 * details or "confirmed" from URL parameters or the client.
 */
export function PatientBookingConfirmation({
  locale, token, accountMarker, status, clinicName, doctorName, dateLabel,
  timeLabel, navLabel, navHref,
}: Props) {
  const t = copy[locale];
  const meta = uiLocaleMeta[locale];
  const confirmed = status === "confirmed";

  return (
    <main className="patient-page atlas-confirmation-page" lang={meta.language} dir={meta.direction}>
      <AtlasPatientNav locale={locale} actionLabel={navLabel} actionHref={navHref} hideLanguageSwitcher />
      <div className="shell atlas-confirmation-container">
        <section className="atlas-confirmation-card" aria-labelledby="confirmation-title">
          <nav className="atlas-confirmation-languages" aria-label={t.language}>
            {languageOptions.map((option) => (
              <Link
                key={option.locale}
                href={privateHref(token, option.locale, accountMarker, true)}
                lang={option.lang}
                dir={option.dir}
                aria-current={locale === option.locale ? "page" : undefined}
              >
                {option.label}
              </Link>
            ))}
          </nav>

          <div className="atlas-confirmation-intro">
            <span className="atlas-confirmation-mark" data-status={status} aria-hidden="true">{confirmed ? "✓" : "◷"}</span>
            <div className="eyebrow">{t.eyebrow}</div>
            <h1 id="confirmation-title">{confirmed ? t.confirmedTitle : t.pendingTitle}</h1>
            <p>{confirmed ? t.confirmedHelp : t.pendingHelp}</p>
          </div>

          <dl className="atlas-confirmation-summary">
            <div><dt>{t.doctor}</dt><dd dir="auto">{doctorName}</dd></div>
            <div><dt>{t.clinic}</dt><dd dir="auto">{clinicName}</dd></div>
            <div><dt>{t.date}</dt><dd>{dateLabel}</dd></div>
            <div><dt>{t.time}</dt><dd><bdi dir="ltr">{timeLabel}</bdi></dd></div>
            <div className="atlas-confirmation-status">
              <dt>{t.status}</dt>
              <dd><span data-status={status}>{confirmed ? t.confirmedStatus : t.pendingStatus}</span></dd>
            </div>
          </dl>

          <div className="atlas-confirmation-actions">
            <Link className="button" href={privateHref(token, locale, accountMarker, false)}>{t.details}</Link>
            <Link className="button button-ghost" href={`/patient-account?lang=${locale}`}>{t.myAppointments}</Link>
          </div>
          <p className="atlas-confirmation-private">{t.privateNote}</p>
        </section>
      </div>
      <style>{`
        .atlas-confirmation-page{min-height:100dvh;background:var(--canvas);color:var(--ink)}
        .atlas-confirmation-container{width:min(100% - 24px,760px);padding-block:clamp(18px,5vw,48px) 72px}
        .atlas-confirmation-card{padding:clamp(20px,5vw,42px);border:1px solid var(--line);border-radius:26px;background:var(--surface);box-shadow:0 20px 52px rgba(17,65,39,.08)}
        .atlas-confirmation-languages{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-bottom:28px}
        .atlas-confirmation-languages a{min-width:0;min-height:44px;display:grid;place-items:center;padding:8px 4px;border:1px solid var(--line);border-radius:14px;color:var(--ink);text-decoration:none;font-size:12px;font-weight:750;text-align:center}
        .atlas-confirmation-languages a[aria-current=page]{background:var(--surface-soft);border-color:var(--accent);color:var(--accent)}
        .atlas-confirmation-mark{width:60px;height:60px;display:grid;place-items:center;border-radius:20px;background:var(--warning-bg);color:var(--warning);font-size:28px;font-weight:850;margin-bottom:18px}
        .atlas-confirmation-mark[data-status=confirmed]{background:var(--success-bg);color:var(--success)}
        .atlas-confirmation-intro h1{margin:9px 0 13px;font-size:clamp(27px,5vw,38px);line-height:1.2;overflow-wrap:anywhere}
        .atlas-confirmation-intro p{margin:0 0 26px;max-width:60ch;line-height:1.65;color:var(--ink-soft)}
        .atlas-confirmation-summary{margin:0;display:grid;border:1px solid var(--line);border-radius:19px;overflow:hidden;background:var(--surface-soft)}
        .atlas-confirmation-summary>div{display:grid;grid-template-columns:minmax(100px,1fr) minmax(0,2fr);gap:12px;align-items:start;padding:17px 20px}
        .atlas-confirmation-summary>div+div{border-top:1px solid var(--line)}
        .atlas-confirmation-summary dt{font-size:12px;font-weight:760;color:var(--muted)}
        .atlas-confirmation-summary dd{margin:0;min-width:0;font-size:17px;font-weight:800;line-height:1.45;overflow-wrap:anywhere}
        .atlas-confirmation-status dd span{display:inline-flex;max-width:100%;padding:5px 11px;border-radius:999px;background:var(--warning-bg);color:var(--warning);font-size:13px}
        .atlas-confirmation-status dd span[data-status=confirmed]{background:var(--success-bg);color:var(--success)}
        .atlas-confirmation-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:24px}
        .atlas-confirmation-actions .button{min-height:48px;display:inline-flex;justify-content:center;align-items:center;text-align:center;text-decoration:none;white-space:normal}
        .atlas-confirmation-private{margin:18px 0 0;font-size:12px;line-height:1.5;color:var(--muted)}
        .atlas-confirmation-languages a:focus-visible,.atlas-confirmation-actions a:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
        @media(max-width:520px){.atlas-confirmation-card{border-radius:20px}.atlas-confirmation-summary>div{grid-template-columns:1fr;gap:5px;padding:14px 16px}.atlas-confirmation-actions{grid-template-columns:1fr}.atlas-confirmation-languages a{font-size:11px}}
      `}</style>
    </main>
  );
}
