import Link from "next/link";
import type { UiLocale } from "@/lib/i18n/ui";
import { patientLocaleHref } from "@/app/care/patient-locale";
import "./patient-directory-card.css";

export type PublicDoctorCard = {
  clinic_slug: string;
  doctor_slug: string;
  doctor_name: string;
  specialty: string | null;
  subspecialty?: string | null;
  clinic_name: string;
  city?: string | null;
  area?: string | null;
};

const labels: Record<UiLocale, {
  next: string;
  seeTimes: string;
  noTimes: string;
  viewDoctor: string;
  clinic: string;
}> = {
  en: { next: "Next open time", seeTimes: "View times", noTimes: "No free times in the next 14 days", viewDoctor: "View doctor", clinic: "Clinic" },
  ku: { next: "نزیکترین کاتی بەردەست", seeTimes: "بینینی کاتەکان", noTimes: "لە ١٤ ڕۆژی داهاتوودا کاتی بەردەست نییە", viewDoctor: "بینینی پزیشک", clinic: "کلینیک" },
  bd: { next: "نێزیکترین دەمێ بەردەست", seeTimes: "دیتنا دەمان", noTimes: "د ١٤ ڕۆژێن داهاتی دا دەمێ بەردەست نینە", viewDoctor: "دیتنا دکتۆری", clinic: "کلینیک" },
  ar: { next: "أقرب وقت متاح", seeTimes: "عرض الأوقات", noTimes: "لا توجد أوقات شاغرة خلال الـ١٤ يوماً القادمة", viewDoctor: "عرض الطبيب", clinic: "العيادة" },
};

function PatientLineIcon({ kind }: { kind: "clinic" | "location" | "clock" }) {
  const paths = kind === "clinic"
    ? <><path d="M4 21V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14"/><path d="M2 21h20M9 21v-5h6v5M12 8v5M9.5 10.5h5"/></>
    : kind === "location"
      ? <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>
      : <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>;
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths}</svg>;
}

export function PatientDirectoryCard({
  doctor,
  locale,
  nextOpening,
  preview = false,
}: {
  doctor: PublicDoctorCard;
  locale: UiLocale;
  nextOpening: string | null;
  preview?: boolean;
}) {
  const t = labels[locale];
  const clinicHref = patientLocaleHref(`/care/${doctor.clinic_slug}`, locale);
  const doctorHref = patientLocaleHref(`/care/${doctor.clinic_slug}/${doctor.doctor_slug}`, locale);
  const timesHref = patientLocaleHref(`/care/${doctor.clinic_slug}/${doctor.doctor_slug}/times`, locale);
  const location = [doctor.area, doctor.city].filter(Boolean).join(" · ");

  return (
    <article className="atlas-care-result atlas-marketplace-card">
      <div className="atlas-care-result-heading">
        <span className="atlas-care-doctor-mark" aria-hidden="true">{doctor.doctor_name.trim().slice(0, 1)}</span>
        <div className="atlas-care-doctor-details">
          <h3 dir="auto">{doctor.doctor_name}</h3>
          <p>{doctor.specialty}{doctor.subspecialty ? ` · ${doctor.subspecialty}` : ""}</p>
        </div>
      </div>
      <div className="atlas-marketplace-card-info">
        <div className="atlas-marketplace-card-line">
          <PatientLineIcon kind="clinic" />
          {preview ? <span>{doctor.clinic_name}</span> : <Link href={clinicHref}>{doctor.clinic_name}</Link>}
        </div>
        {location ? <div className="atlas-marketplace-card-line"><PatientLineIcon kind="location" /><span>{location}</span></div> : null}
      </div>
      {nextOpening ? (
        preview ? (
          <div className="atlas-care-next-opening atlas-marketplace-card-time">
            <PatientLineIcon kind="clock" />
            <span>{t.next}<strong dir="auto">{nextOpening}</strong></span>
            <span className="atlas-marketplace-card-time-action">{t.seeTimes}</span>
          </div>
        ) : (
          <Link className="atlas-care-next-opening atlas-marketplace-card-time" href={timesHref} aria-label={`${doctor.doctor_name}: ${t.next} ${nextOpening}. ${t.seeTimes}`}>
            <PatientLineIcon kind="clock" />
            <span>{t.next}<strong dir="auto">{nextOpening}</strong></span>
            <span className="atlas-marketplace-card-time-action">{t.seeTimes}</span>
          </Link>
        )
      ) : (
        <div className="atlas-marketplace-card-no-times"><PatientLineIcon kind="clock"/><span>{t.noTimes}</span></div>
      )}
      {preview ? (
        <span className="button button-ghost atlas-care-view-doctor atlas-marketplace-card-profile" aria-disabled="true">{t.viewDoctor}</span>
      ) : (
        <Link className="button button-ghost atlas-care-view-doctor atlas-marketplace-card-profile" href={doctorHref}>
          {t.viewDoctor}<span aria-hidden="true">›</span>
        </Link>
      )}
    </article>
  );
}
