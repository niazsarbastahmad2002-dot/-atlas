"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type MouseEvent, useEffect, useState } from "react";
import { trackAtlasEvent } from "@/lib/analytics/client";
import { classifyAtlasScreen } from "@/lib/analytics/schema";
import { uiText, type UiLocale } from "@/lib/i18n/ui";
import { flushSettingWrites, hasPendingSettingWrite, needsFreshSettingNavigation } from "./setting-write-barrier";

const scheduleMemoryKey = "atlas:last-schedule-href";

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

function isPlainNavigation(event: MouseEvent<HTMLAnchorElement>) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function baghdadDay(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function shiftBaghdadDay(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00+03:00`);
  date.setUTCDate(date.getUTCDate() + amount);
  return baghdadDay(date);
}

function validRememberedSchedule(href: string | null) {
  if (!href) return "/dashboard";
  try {
    const url = new URL(href, window.location.origin);
    if (url.pathname !== "/dashboard") return "/dashboard";
    const day = url.searchParams.get("day");
    if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return `${url.pathname}${url.search}`;

    const today = baghdadDay(new Date());
    const yesterday = shiftBaghdadDay(today, -1);
    if (day < yesterday) {
      url.searchParams.set("day", today);
      return `${url.pathname}?${url.searchParams}`;
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return "/dashboard";
  }
}

function todayScheduleFrom(href: string) {
  try {
    const url = new URL(href, window.location.origin);
    url.pathname = "/dashboard";
    url.searchParams.set("day", baghdadDay(new Date()));
    return `${url.pathname}?${url.searchParams}`;
  } catch {
    return "/dashboard";
  }
}

function withHash(href: string, hash: string) {
  const url = new URL(href, window.location.origin);
  url.hash = hash;
  return `${url.pathname}${url.search}${url.hash}`;
}

export function AppNavigation({ locale }: { locale: UiLocale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const router = useRouter();
  const [visiblePath, setVisiblePath] = useState(pathname);
  const [scheduleHref, setScheduleHref] = useState("/dashboard");
  const [settingsHref, setSettingsHref] = useState("/dashboard/settings");
  const t = uiText(locale);
  const onSettings = visiblePath.startsWith("/dashboard/settings")
    || visiblePath.startsWith("/dashboard/reminders")
    || visiblePath.startsWith("/dashboard/staff")
    || visiblePath.startsWith("/dashboard/history");
  const onSchedule = visiblePath === "/dashboard";

  useEffect(() => {
    setVisiblePath(pathname);

    if (pathname === "/dashboard") {
      const candidate = validRememberedSchedule(`${pathname}${searchKey ? `?${searchKey}` : ""}`);
      const workspace = document.querySelector<HTMLElement>(".workspace-page");
      const canRemember = workspace?.dataset.atlasMemoryValid !== "false";
      const current = canRemember ? candidate : todayScheduleFrom(candidate);
      setScheduleHref(current);
      try { window.localStorage.setItem(scheduleMemoryKey, current); } catch {}

      const clinic = new URL(current, window.location.origin).searchParams.get("clinic");
      setSettingsHref(clinic ? `/dashboard/settings?${new URLSearchParams({ clinic })}` : "/dashboard/settings");
      return;
    }

    let remembered = "/dashboard";
    try { remembered = validRememberedSchedule(window.localStorage.getItem(scheduleMemoryKey)); } catch {}
    setScheduleHref(remembered);

    const currentClinic = new URLSearchParams(searchKey).get("clinic")
      ?? new URL(remembered, window.location.origin).searchParams.get("clinic");
    setSettingsHref(currentClinic ? `/dashboard/settings?${new URLSearchParams({ clinic: currentClinic })}` : "/dashboard/settings");
  }, [pathname, searchKey]);

  useEffect(() => {
    const warmCoreRoutes = () => {
      if (hasPendingSettingWrite() || needsFreshSettingNavigation()) return;
      router.prefetch(scheduleHref);
      router.prefetch(settingsHref);
    };

    warmCoreRoutes();
    const timer = window.setInterval(warmCoreRoutes, 20_000);
    const onVisible = () => {
      if (!document.hidden) warmCoreRoutes();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, scheduleHref, settingsHref]);

  const go = (href: string, interaction: "topbar" | "bottom_nav" | "brand") => async (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isPlainNavigation(event)) return;
    event.preventDefault();
    trackAtlasEvent("atlas_navigation", {
      target: classifyAtlasScreen(href),
      interaction,
      locale,
    });
    const targetPath = new URL(href, window.location.origin).pathname;
    setVisiblePath(targetPath);

    const coreTarget = targetPath === "/dashboard" || targetPath === "/dashboard/settings";
    if (coreTarget && (hasPendingSettingWrite() || needsFreshSettingNavigation())) {
      await flushSettingWrites();
      // A real load is intentional here: Next may have prefetched this route
      // before the setting changed. Never let that old payload overwrite the
      // value the database has already confirmed.
      window.location.assign(href);
      return;
    }

    router.prefetch(href);
    router.push(href, { scroll: true });
  };

  const warm = (href: string) => () => {
    const targetPath = new URL(href, window.location.origin).pathname;
    const coreTarget = targetPath === "/dashboard" || targetPath === "/dashboard/settings";
    if (coreTarget && (hasPendingSettingWrite() || needsFreshSettingNavigation())) return;
    router.prefetch(href);
  };
  const addHref = typeof window === "undefined" ? "/dashboard#new-appointment" : withHash(scheduleHref, "new-appointment");

  return (
    <>
      <header className="app-topbar">
        <div className="app-topbar-inner shell">
          <Link className="app-brand" href={scheduleHref} prefetch={true} scroll={true} onPointerDown={warm(scheduleHref)} onClick={go(scheduleHref, "brand")} aria-label={t.openSchedule}>
            <span className="app-brand-mark" aria-hidden="true">A</span>
            <span className="app-brand-word">Atlas</span>
          </Link>
          <nav className="app-top-actions" aria-label="Atlas navigation">
            <Link className={`icon-button ${onSchedule ? "is-active" : ""}`} href={scheduleHref} prefetch={true} scroll={true} onPointerDown={warm(scheduleHref)} onMouseEnter={warm(scheduleHref)} onClick={go(scheduleHref, "topbar")} aria-label={t.openSchedule} title={t.schedule}>
              <CalendarIcon /><span className="icon-button-label">{t.schedule}</span>
            </Link>
            <Link className={`icon-button ${onSettings ? "is-active" : ""}`} href={settingsHref} prefetch={true} scroll={true} onPointerDown={warm(settingsHref)} onMouseEnter={warm(settingsHref)} onClick={go(settingsHref, "topbar")} aria-label={t.openSettings} title={t.settings}>
              <GearIcon /><span className="icon-button-label">{t.settings}</span>
            </Link>
          </nav>
        </div>
      </header>

      <nav className="app-bottom-nav" aria-label="Atlas mobile navigation">
        <Link className={onSchedule ? "is-active" : ""} href={scheduleHref} prefetch={true} scroll={true} onPointerDown={warm(scheduleHref)} onClick={go(scheduleHref, "bottom_nav")}>
          <CalendarIcon /><span>{t.schedule}</span>
        </Link>
        <Link className="app-bottom-add" href={addHref} prefetch={true} scroll={true} onClick={go(addHref, "bottom_nav")}>
          <span className="app-bottom-add-circle"><PlusIcon /></span><span>{t.add}</span>
        </Link>
        <Link className={onSettings ? "is-active" : ""} href={settingsHref} prefetch={true} scroll={true} onPointerDown={warm(settingsHref)} onClick={go(settingsHref, "bottom_nav")}>
          <GearIcon /><span>{t.settings}</span>
        </Link>
      </nav>
    </>
  );
}
