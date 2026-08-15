"use client";

import { usePathname } from "next/navigation";
import { uiText, type UiLocale } from "@/lib/i18n/ui";

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 2v3M17 2v3M3.5 9h17M5.5 4h13a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1a1.7 1.7 0 0 0-1.4-1.67 1.7 1.7 0 0 0-1.53.47l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.77 8.2a1.7 1.7 0 0 0-.47-1.53l-.06-.06L7.1 3.75l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.8 4.77a1.7 1.7 0 0 0 1.53-.47l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 19.4 9c.08.37.29.72.6 1 .3.25.68.4 1.1.4h.1v4h-.1A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  );
}

export function AppNavigation({ locale }: { locale: UiLocale }) {
  const pathname = usePathname();
  const t = uiText(locale);
  const onSettings = pathname.startsWith("/dashboard/settings")
    || pathname.startsWith("/dashboard/reminders")
    || pathname.startsWith("/dashboard/staff");
  const onSchedule = pathname === "/dashboard";

  return (
    <>
      <header className="app-topbar">
        <div className="app-topbar-inner shell">
          <a className="app-brand" href="/dashboard" aria-label={t.openSchedule}>
            <span className="app-brand-mark" aria-hidden="true">A</span>
            <span className="app-brand-word">Atlas</span>
          </a>
          <nav className="app-top-actions" aria-label="Atlas navigation">
            <a
              className={`icon-button ${onSchedule ? "is-active" : ""}`}
              href="/dashboard"
              aria-label={t.openSchedule}
              title={t.schedule}
            >
              <CalendarIcon />
              <span className="icon-button-label">{t.schedule}</span>
            </a>
            <a
              className={`icon-button ${onSettings ? "is-active" : ""}`}
              href="/dashboard/settings"
              aria-label={t.openSettings}
              title={t.settings}
            >
              <GearIcon />
              <span className="icon-button-label">{t.settings}</span>
            </a>
          </nav>
        </div>
      </header>

      <nav className="app-bottom-nav" aria-label="Atlas mobile navigation">
        <a className={onSchedule ? "is-active" : ""} href="/dashboard">
          <CalendarIcon />
          <span>{t.schedule}</span>
        </a>
        <a className="app-bottom-add" href="/dashboard#new-appointment">
          <span className="app-bottom-add-circle"><PlusIcon /></span>
          <span>{t.add}</span>
        </a>
        <a className={onSettings ? "is-active" : ""} href="/dashboard/settings">
          <GearIcon />
          <span>{t.settings}</span>
        </a>
      </nav>
    </>
  );
}
