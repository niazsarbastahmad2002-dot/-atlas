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
  ar: { today: "اليوم", yesterday: "أمس", tomorrow: "باچر", cancelled: "ملغاة" },
} as const;

function selectedDayFromLocation(today: string) {
  const requested = new URL(window.location.href).searchParams.get("day");
  return requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : today;
}

function syncSelectedDayLabel() {
  const current = document.querySelector<HTMLAnchorElement>(".day-navigation .day-current");
  if (!current) return;

  const today = baghdadToday();
  const selectedDay = selectedDayFromLocation(today);
  const copy = labels[pageLocale()];
  const relativeLabel = selectedDay === today
    ? copy.today
    : selectedDay === shiftDay(today, -1)
      ? copy.yesterday
      : selectedDay === shiftDay(today, 1)
        ? copy.tomorrow
        : null;

  let label = current.querySelector<HTMLSpanElement>("[data-atlas-relative-day]");
  if (!relativeLabel) {
    label?.remove();
    current.classList.remove("has-relative-day");
    return;
  }

  if (!label) {
    label = document.createElement("span");
    label.dataset.atlasRelativeDay = "true";
    current.appendChild(label);
  }

  current.classList.add("has-relative-day");
  if (label.textContent !== relativeLabel) label.textContent = relativeLabel;
}

function syncCancelledStat() {
  const stats = document.querySelector<HTMLElement>(".workspace-stats");
  if (!stats) return;

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
  const nextLabel = labels[pageLocale()].cancelled;
  const nextValue = String(cancelledCount);
  if (label && label.textContent !== nextLabel) label.textContent = nextLabel;
  if (value && value.textContent !== nextValue) value.textContent = nextValue;
}

export function ScheduleNavigationPolish() {
  const router = useRouter();

  useEffect(() => {
    const prefetchDays = () => {
      document.querySelectorAll<HTMLAnchorElement>(".day-navigation a[href^='/dashboard?']").forEach((link) => {
        const href = link.getAttribute("href");
        if (href) router.prefetch(href);
      });
    };

    const sync = () => {
      syncSelectedDayLabel();
      syncCancelledStat();
      prefetchDays();
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

      const dayLink = target?.closest<HTMLAnchorElement>(".day-navigation a[href^='/dashboard?']");
      const dayHref = dayLink?.getAttribute("href");
      if (dayHref) {
        event.preventDefault();
        const navigation = dayLink.closest<HTMLElement>(".day-navigation");
        navigation?.classList.add("is-navigating");
        router.push(dayHref, { scroll: false });
        return;
      }

      const appointmentLink = target?.closest<HTMLAnchorElement>("a[href='#new-appointment']");
      if (!appointmentLink) return;
      const composer = document.getElementById("new-appointment");
      const patientName = document.getElementById("patient_name") as HTMLInputElement | null;
      if (!composer || !patientName) return;
      event.preventDefault();
      composer.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => patientName.focus({ preventScroll: true }), 180);
    };

    sync();
    document.addEventListener("pointerdown", warmDay, { passive: true });
    document.addEventListener("mouseover", warmDay, { passive: true });
    document.addEventListener("click", handleClick);

    const content = document.querySelector(".app-content");
    const observer = content ? new MutationObserver(() => {
      document.querySelector(".day-navigation")?.classList.remove("is-navigating");
      sync();
    }) : null;
    observer?.observe(content!, { childList: true, subtree: true });

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
      .day-current [data-atlas-relative-day] {
        display: block !important;
        color: var(--accent);
        font-size: 10px;
        font-weight: 850;
        line-height: 1.2;
      }
      .day-current.has-relative-day::after { content: none !important; }
      @media (max-width: 720px) {
        .workspace-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
    `}</style>
  );
}
