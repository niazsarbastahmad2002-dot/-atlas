"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

function isPlainPrimaryClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function shiftDay(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00+03:00`);
  date.setUTCDate(date.getUTCDate() + amount);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function baghdadToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function pageLocale() {
  const lang = document.documentElement.lang.toLowerCase();
  if (lang.startsWith("ckb") || lang.startsWith("ku")) return "ku";
  if (lang.startsWith("ar")) return "ar";
  return "en";
}

const labels = {
  en: { today: "Today", yesterday: "Yesterday", tomorrow: "Tomorrow", cancelled: "Cancelled" },
  ku: { today: "ئەمڕۆ", yesterday: "دوێنێ", tomorrow: "سبەی", cancelled: "هەڵوەشێنراوە" },
  ar: { today: "اليوم", yesterday: "أمس", tomorrow: "غداً", cancelled: "ملغاة" },
} as const;

function syncRelativeDayLabels() {
  const locale = pageLocale();
  const copy = labels[locale];
  const today = baghdadToday();
  const yesterday = shiftDay(today, -1);
  const tomorrow = shiftDay(today, 1);

  document.querySelectorAll<HTMLAnchorElement>(".day-navigation > a.button[href^='/dashboard?']").forEach((link) => {
    const href = link.getAttribute("href");
    const label = link.querySelector("span");
    if (!href || !label) return;
    const day = new URL(href, window.location.origin).searchParams.get("day");
    const nextLabel = day === today
      ? copy.today
      : day === yesterday
        ? copy.yesterday
        : day === tomorrow
          ? copy.tomorrow
          : null;
    if (nextLabel && label.textContent !== nextLabel) label.textContent = nextLabel;
  });
}

function syncCancelledStat() {
  const stats = document.querySelector<HTMLElement>(".workspace-stats");
  if (!stats) return;

  const locale = pageLocale();
  const cancelledCount = document.querySelectorAll(".appointments-panel .status-cancelled").length;
  let card = stats.querySelector<HTMLElement>("[data-atlas-cancelled-stat]");

  if (!card) {
    card = document.createElement("article");
    card.className = "stat";
    card.dataset.atlasCancelledStat = "true";
    card.innerHTML = "<span></span><strong></strong>";
    stats.appendChild(card);
  }

  const label = card.querySelector("span");
  const value = card.querySelector("strong");
  const nextLabel = labels[locale].cancelled;
  const nextValue = String(cancelledCount);
  if (label && label.textContent !== nextLabel) label.textContent = nextLabel;
  if (value && value.textContent !== nextValue) value.textContent = nextValue;
}

export function ScheduleNavigationPolish() {
  const router = useRouter();

  useEffect(() => {
    const sync = () => {
      syncRelativeDayLabels();
      syncCancelledStat();
    };

    const warmDay = (event: Event) => {
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest<HTMLAnchorElement>(".day-navigation a[href^='/dashboard?']");
      const href = link?.getAttribute("href");
      if (href) router.prefetch(href);
    };

    const handleClick = (event: MouseEvent) => {
      if (!isPlainPrimaryClick(event)) return;
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest<HTMLAnchorElement>("a[href='#new-appointment']");
      if (!link) return;
      const composer = document.getElementById("new-appointment");
      const patientName = document.getElementById("patient_name") as HTMLInputElement | null;
      if (!composer || !patientName) return;
      event.preventDefault();
      composer.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => patientName.focus({ preventScroll: true }), 260);
    };

    sync();
    document.addEventListener("pointerdown", warmDay, { passive: true });
    document.addEventListener("mouseover", warmDay, { passive: true });
    document.addEventListener("click", handleClick);

    const workspace = document.querySelector(".workspace-page");
    const observer = workspace ? new MutationObserver(sync) : null;
    observer?.observe(workspace!, { childList: true, subtree: true });

    return () => {
      observer?.disconnect();
      document.removeEventListener("pointerdown", warmDay);
      document.removeEventListener("mouseover", warmDay);
      document.removeEventListener("click", handleClick);
    };
  }, [router]);

  return (
    <style jsx global>{`
      .workspace-stats { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      @media (max-width: 720px) {
        .workspace-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
    `}</style>
  );
}
