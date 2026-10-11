import Link from "next/link";
import type { UiLocale } from "@/lib/i18n/ui";
import { patientLocaleHref } from "@/app/care/patient-locale";
import "./patient-clinic-browse.css";

export type PatientClinicBrowseItem = {
  clinic_slug: string;
  clinic_name: string;
  city?: string | null;
  area?: string | null;
};

function ClinicLineIcon() {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M5 21V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14M10 21v-5h4v5M12 8v5M9.5 10.5h5" />
    </svg>
  );
}

export function PatientClinicBrowse({
  clinics, locale, title, actionLabel, preview = false,
}: {
  clinics: PatientClinicBrowseItem[];
  locale: UiLocale;
  title: string;
  actionLabel: string;
  preview?: boolean;
}) {
  if (!clinics.length) return null;
  return (
    <section className="atlas-clinic-browse" aria-label={title}>
      <div className="atlas-clinic-browse-heading">
        <h2>{title}</h2>
      </div>
      <div className="atlas-clinic-browse-grid">
        {clinics.map((clinic) => {
          const text = (
            <>
              <span className="atlas-clinic-browse-icon"><ClinicLineIcon /></span>
              <span className="atlas-clinic-browse-details">
                <strong dir="auto">{clinic.clinic_name}</strong>
                {[clinic.area, clinic.city].filter(Boolean).length ? <small dir="auto">{[clinic.area, clinic.city].filter(Boolean).join(" · ")}</small> : null}
              </span>
              <span className="atlas-clinic-browse-action">{actionLabel}<span aria-hidden="true">↗</span></span>
            </>
          );
          return preview
            ? <div className="atlas-clinic-browse-card" key={clinic.clinic_slug} aria-disabled="true">{text}</div>
            : <Link className="atlas-clinic-browse-card" href={patientLocaleHref(`/care/${clinic.clinic_slug}`, locale)} key={clinic.clinic_slug}>{text}</Link>;
        })}
      </div>
    </section>
  );
}
