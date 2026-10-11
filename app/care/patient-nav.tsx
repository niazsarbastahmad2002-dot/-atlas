import type { UiLocale } from "@/lib/i18n/ui";

type AtlasPatientNavProps = {
  locale: UiLocale;
  myAppointments?: string;
  actionLabel?: string;
  actionHref?: string;
};

export function AtlasPatientNav({
  locale,
  myAppointments,
  actionLabel,
  actionHref,
}: AtlasPatientNavProps) {
  const label = actionLabel ?? myAppointments ?? "My appointments";
  const href = actionHref ?? `/patient-account?lang=${locale}`;
  const careHref = `/api/ui-language?locale=${locale}`;

  return (
    <nav
      className="nav shell marketing-nav atlas-patient-nav"
      dir={locale === "en" ? "ltr" : "rtl"}
    >
      <a
        className="app-brand atlas-marketing-brand atlas-patient-brand"
        href={careHref}
        aria-label="Atlas Patient"
      >
        <span className="app-brand-mark" aria-hidden="true">A</span>
        <span className="app-brand-word">Atlas</span>
        <span className="atlas-patient-brand-label" dir="ltr">Patient</span>
      </a>
      <a
        className="button button-ghost atlas-patient-account-link"
        href={href}
      >
        {label}
      </a>

      <style>{`
        .atlas-patient-nav{align-items:center;justify-content:space-between;gap:12px;min-height:78px;padding-block:12px}
        .atlas-patient-nav .atlas-patient-brand{display:inline-flex;align-items:center;gap:10px;min-height:48px;border-radius:14px;padding:4px 9px 4px 4px;background:#fff;color:#153e2c!important;text-decoration:none}
        .atlas-patient-nav .atlas-patient-brand .app-brand-word{color:#153e2c!important;opacity:1!important;visibility:visible!important;font-size:23px;font-weight:900;letter-spacing:-.05em}
        .atlas-patient-nav .atlas-patient-brand .app-brand-mark{background:#18563b!important;color:#fff!important}
        .atlas-patient-nav .atlas-patient-account-link{display:inline-flex;align-items:center;min-height:46px;border:1px solid #cbded0;background:#fff;color:#164b33!important;font-weight:800}
        .atlas-patient-nav .atlas-patient-account-link:hover{background:#e3f2e7}
        .atlas-patient-nav .atlas-patient-brand:focus-visible,.atlas-patient-nav .atlas-patient-account-link:focus-visible{outline:3px solid #2c8760;outline-offset:3px}
        @media(max-width:420px){.atlas-patient-nav{min-height:72px}.atlas-patient-nav .atlas-patient-brand .app-brand-word{font-size:20px}.atlas-patient-nav .atlas-patient-account-link{font-size:12px;padding-inline:11px}}
        .atlas-patient-brand{display:inline-flex;align-items:center;gap:8px}
        .atlas-patient-brand-label{border-inline-start:1px solid var(--line);padding-inline-start:8px;color:var(--accent);font-size:11px;font-weight:850;letter-spacing:.02em}
        .atlas-patient-account-link{min-height:42px;text-decoration:none}
      `}</style>
    </nav>
  );
}
