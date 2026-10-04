"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import type { UiLocale } from "@/lib/i18n/ui";

type AtlasPatientNavProps = {
  locale: UiLocale;
  myAppointments?: string;
  actionLabel?: string;
  actionHref?: string;
};

async function persistPatientLocale(
  event: MouseEvent<HTMLAnchorElement>,
  locale: UiLocale,
  href: string,
) {
  if (
    event.button !== 0
    || event.metaKey
    || event.ctrlKey
    || event.shiftKey
    || event.altKey
  ) return;

  event.preventDefault();
  try {
    await fetch("/api/ui-language", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale }),
    });
  } catch {
    // The explicit Patient route still remains usable if preference persistence fails.
  }
  window.location.assign(href);
}

export function AtlasPatientNav({
  locale,
  myAppointments,
  actionLabel,
  actionHref,
}: AtlasPatientNavProps) {
  const label = actionLabel ?? myAppointments ?? "My appointments";
  const href = actionHref ?? `/patient-account?lang=${locale}`;

  return (
    <nav
      className="nav shell marketing-nav atlas-patient-nav"
      dir={locale === "en" ? "ltr" : "rtl"}
    >
      <Link
        className="app-brand atlas-marketing-brand atlas-patient-brand"
        href="/care"
        aria-label="Atlas Patient"
        onClick={(event) => void persistPatientLocale(event, locale, "/care")}
      >
        <span className="app-brand-mark" aria-hidden="true">A</span>
        <span className="app-brand-word">Atlas</span>
        <span className="atlas-patient-brand-label" dir="ltr">Patient</span>
      </Link>
      <Link
        className="button button-ghost atlas-patient-account-link"
        href={href}
        onClick={(event) => void persistPatientLocale(event, locale, href)}
      >
        {label}
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
