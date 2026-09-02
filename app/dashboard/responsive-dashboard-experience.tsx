"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { toAsciiDigits } from "@/lib/i18n/format";
import { localizeDashboardMessageText, localizedDashboardMessage } from "@/lib/dashboard-message-copy";
import type { UiLocale } from "@/lib/i18n/ui";

const tabletStatsCopy = {
  en: { noShow: "No-show", cancelled: "Cancelled" },
  ku: { noShow: "نەهاتن", cancelled: "هەڵوەشاوە" },
  bd: { noShow: "نەهاتن", cancelled: "هەلوەشاندی" },
  ar: { noShow: "عدم الحضور", cancelled: "ملغي" },
} as const;

function requestScroll(element: HTMLElement, block: ScrollLogicalPosition = "center") {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: "smooth", block, inline: "nearest" });
    });
  });
}

function isTabletSummaryViewport() {
  return window.matchMedia("(min-width: 561px) and (max-width: 1400px)").matches;
}

function appointmentStatusCount(status: string) {
  let count = 0;
  document.querySelectorAll<HTMLElement>(".polished-appointment-list .appointment-row").forEach((row) => {
    const select = row.querySelector<HTMLSelectElement>(".appointment-status-select");
    const selectedStatus = select?.value;
    const hasStatusBadge = Boolean(row.querySelector(`.status-${status}`));
    if (selectedStatus === status || (!selectedStatus && hasStatusBadge)) count += 1;
  });
  return count;
}

function upsertTabletStat(summary: HTMLElement, tone: "no-show" | "cancelled", label: string, value: number) {
  const selector = `.schedule-stat-${tone}`;
  let card = summary.querySelector<HTMLElement>(selector);
  if (!card) {
    card = document.createElement("article");
    card.className = `stat schedule-stat schedule-stat-${tone} atlas-tablet-extra-stat`;
    const labelNode = document.createElement("span");
    const valueNode = document.createElement("strong");
    card.append(labelNode, valueNode);
    summary.append(card);
  }
  const labelNode = card.querySelector<HTMLElement>("span");
  const valueNode = card.querySelector<HTMLElement>("strong");
  if (labelNode && labelNode.textContent !== label) labelNode.textContent = label;
  if (valueNode && valueNode.textContent !== String(value)) valueNode.textContent = String(value);
}

function syncTabletStats(locale: UiLocale) {
  const summary = document.querySelector<HTMLElement>(".schedule-summary");
  if (!summary) return;

  if (!isTabletSummaryViewport()) {
    summary.classList.remove("atlas-tablet-six-stats");
    summary.querySelectorAll(".atlas-tablet-extra-stat").forEach((node) => node.remove());
    return;
  }

  summary.classList.add("atlas-tablet-six-stats");
  const copy = tabletStatsCopy[locale];
  upsertTabletStat(summary, "no-show", copy.noShow, appointmentStatusCount("no_show"));
  upsertTabletStat(summary, "cancelled", copy.cancelled, appointmentStatusCount("cancelled"));
}

function localizeWorkspaceNotices(locale: UiLocale, searchParams: URLSearchParams) {
  document.querySelectorAll<HTMLElement>(".workspace-notice").forEach((notice) => {
    const raw = notice.textContent?.trim();
    if (!raw) return;

    const code = notice.classList.contains("notice-error")
      ? searchParams.get("error")
      : searchParams.get("notice");
    const translated = localizedDashboardMessage(code, locale) ?? localizeDashboardMessageText(raw, locale);
    if (translated && translated !== raw) notice.textContent = translated;
  });
}

function timeCandidates(after: string) {
  const match = /T(\d{2}):(\d{2})$/.exec(after);
  if (!match) return new Set<string>();
  const hour24 = Number(match[1]);
  const minute = match[2];
  const hour12 = ((hour24 + 11) % 12) + 1;
  return new Set([`${hour24}:${minute}`, `${String(hour24).padStart(2, "0")}:${minute}`, `${hour12}:${minute}`, `${String(hour12).padStart(2, "0")}:${minute}`]);
}

function rowMatchesSavedTime(row: HTMLElement, candidates: Set<string>) {
  const raw = row.querySelector<HTMLElement>(".appointment-time-value")?.textContent ?? "";
  const ascii = toAsciiDigits(raw);
  const matches = ascii.match(/\b\d{1,2}:\d{2}\b/g) ?? [];
  return matches.some((time) => candidates.has(time) || candidates.has(time.replace(/^0/, "")));
}

function expandPhoneRow(row: HTMLElement) {
  if (!window.matchMedia("(max-width: 560px)").matches) return;
  const summary = row.querySelector<HTMLButtonElement>(".atlas-phone-appointment-summary");
  if (!summary || row.classList.contains("is-atlas-phone-expanded")) return;
  row.classList.add("is-atlas-phone-expanded");
  summary.setAttribute("aria-expanded", "true");
}

function scrollHashTarget() {
  if (!window.location.hash) return false;
  const id = decodeURIComponent(window.location.hash.slice(1));
  const target = document.getElementById(id);
  if (!target) return false;
  requestScroll(target, "start");
  return true;
}

function handleSameDocumentBottomNavigation(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const anchor = target.closest<HTMLAnchorElement>(".app-bottom-nav a");
  if (!anchor) return;

  const destination = new URL(anchor.href, window.location.origin);
  if (destination.pathname !== window.location.pathname || destination.search !== window.location.search) return;

  if (anchor.classList.contains("app-bottom-add") && destination.hash) {
    const element = document.getElementById(decodeURIComponent(destination.hash.slice(1)));
    if (!element) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.history.replaceState(window.history.state, "", `${destination.pathname}${destination.search}${destination.hash}`);
    requestScroll(element, "start");
    return;
  }

  if (!anchor.classList.contains("app-bottom-add") && destination.pathname === "/dashboard" && !destination.hash) {
    event.preventDefault();
    event.stopImmediatePropagation();
    window.history.replaceState(window.history.state, "", `${destination.pathname}${destination.search}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

export function ResponsiveDashboardExperience({ locale }: { locale: UiLocale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const focusedSave = useRef<string | null>(null);

  useEffect(() => {
    if (pathname !== "/dashboard") return;
    const params = new URLSearchParams(searchKey);
    let frame = 0;

    const focusSavedAppointment = () => {
      const notice = params.get("notice");
      const after = params.get("after");
      if (!after || (notice !== "appointment_created" && notice !== "appointment_duplicate")) return;
      const focusKey = `${notice}|${after}|${params.get("doctor") ?? ""}`;
      if (focusedSave.current === focusKey) return;

      const candidates = timeCandidates(after);
      if (!candidates.size) return;
      const rows = Array.from(document.querySelectorAll<HTMLElement>(".polished-appointment-list .appointment-row"));
      const row = rows.find((candidate) => rowMatchesSavedTime(candidate, candidates));
      if (!row) return;

      focusedSave.current = focusKey;
      rows.forEach((candidate) => candidate.classList.remove("is-atlas-post-save-focus"));
      row.classList.add("is-atlas-post-save-focus");
      row.dataset.atlasPostSaveTarget = "true";
      expandPhoneRow(row);
      requestScroll(row, "center");
    };

    const update = () => {
      frame = 0;
      localizeWorkspaceNotices(locale, params);
      syncTabletStats(locale);
      focusSavedAppointment();
    };

    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    scrollHashTarget();

    const root = document.querySelector<HTMLElement>(".app-content") ?? document.body;
    const observer = new MutationObserver(scheduleUpdate);
    observer.observe(root, { childList: true, subtree: true });
    document.addEventListener("change", scheduleUpdate);
    window.addEventListener("resize", scheduleUpdate);
    document.addEventListener("click", handleSameDocumentBottomNavigation, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("change", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      document.removeEventListener("click", handleSameDocumentBottomNavigation, true);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [locale, pathname, searchKey]);

  return null;
}
