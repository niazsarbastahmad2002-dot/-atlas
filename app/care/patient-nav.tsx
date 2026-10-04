import Link from "next/link";
import type { UiLocale } from "@/lib/i18n/ui";

type AtlasPatientNavProps = {
  locale: UiLocale;
  myAppointments: string;
};

export function AtlasPatientNav({ locale, myAppointments }: AtlasPatientNavProps) {
  return (
    <nav className="nav shell marketing-nav atlas-patient-nav">
      <Link className="app-brand atlas-marketing-brand atlas-patient-brand" href="/care" aria-label="Atlas Patient">
        <span className="app-brand-mark" aria-hidden="true">A</span>
        <span className="app-brand-word">Atlas</span>
        <span className="atlas-patient-brand-label" dir="ltr">Patient</span>
      </Link>
      <Link
        className="button button-ghost atlas-patient-account-link"
        href={`/patient-account?lang=${locale}`}
      >
        {myAppointments}
      </Link>

      <style>{`
        .atlas-patient-nav{align-items:center;justify-content:space-between}
        .atlas-patient-brand{display:inline-flex;align-items:center;gap:8px}
        .atlas-patient-brand-label{border-inline-start:1px solid var(--line);padding-inline-start:8px;color:var(--accent);font-size:11px;font-weight:850;letter-spacing:.02em}
        .atlas-patient-account-link{min-height:42px;text-decoration:none}
      `}</style>
    </nav>
  );
}
