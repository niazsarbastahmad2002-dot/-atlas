import type { UiLocale } from "@/lib/i18n/ui";
import { PatientLanguageSwitcher } from "./patient-language-switcher";

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
        <span className="app-brand-mark atlas-patient-logo" aria-hidden="true"><img src="/atlas-icon.svg" width="44" height="44" alt="" /></span>
        <span className="app-brand-word">Atlas</span>
        <span className="atlas-patient-brand-label" dir="ltr">Patient</span>
      </a>
      <div className="atlas-patient-nav-actions">
        <PatientLanguageSwitcher locale={locale} />
        <a
        className="button button-ghost atlas-patient-account-link"
        href={href}
      >
        {label}
        </a>
      </div>

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
        .atlas-patient-nav .atlas-patient-brand .atlas-patient-logo{width:44px;height:44px;display:inline-grid;place-items:center;overflow:hidden;background:transparent!important;border-radius:12px;box-shadow:none}
        .atlas-patient-logo img{width:44px;height:44px;display:block;object-fit:contain}
        .atlas-patient-nav-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;min-width:0}
        .atlas-patient-language{display:inline-flex;align-items:center;gap:7px;min-height:46px;padding:0 12px;background:#fff;border:1px solid #cbded0;border-radius:13px;color:#164b33;font-size:12px;font-weight:750}
        .atlas-patient-language span{white-space:nowrap}
        .atlas-patient-language select{appearance:auto;min-width:108px;width:auto;min-height:42px;padding:4px 0;border:0;border-radius:0;box-shadow:none!important;background:transparent;color:#153e2c;font-size:13px;font-weight:780;cursor:pointer}
        .atlas-patient-language:focus-within{outline:3px solid #2c8760;outline-offset:2px}
        .atlas-patient-language select:focus{outline:none}
        @media(max-width:660px){.atlas-patient-nav{flex-wrap:wrap;min-height:68px;padding-block:10px}.atlas-patient-nav-actions{flex:1 1 auto}.atlas-patient-language span{display:none}.atlas-patient-language{padding-inline:9px}.atlas-patient-language select{min-width:90px}.atlas-patient-brand-label{font-size:10px}}
        @media(max-width:410px){.atlas-patient-nav-actions{width:100%;justify-content:space-between}.atlas-patient-nav .atlas-patient-brand{padding-block:0}.atlas-patient-nav .atlas-patient-account-link{font-size:12px}}
        :root[data-theme="dark"] .atlas-patient-language,:root[data-theme="dark"] .atlas-patient-nav .atlas-patient-brand,:root[data-theme="dark"] .atlas-patient-nav .atlas-patient-account-link{background:#fff;color:#153e2c!important}
        @media(prefers-color-scheme:dark){:root[data-theme="system"] .atlas-patient-language,:root[data-theme="system"] .atlas-patient-nav .atlas-patient-brand,:root[data-theme="system"] .atlas-patient-nav .atlas-patient-account-link{background:#fff;color:#153e2c!important}}
        
        .atlas-patient-brand-label{border-inline-start:1px solid var(--line);padding-inline-start:8px;color:var(--accent);font-size:11px;font-weight:850;letter-spacing:.02em}
        .atlas-patient-account-link{min-height:42px;text-decoration:none}
      `}</style>
    </nav>
  );
}
