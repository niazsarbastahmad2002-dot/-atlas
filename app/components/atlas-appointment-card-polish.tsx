"use client";

import { useEffect } from "react";
import { localizeDigits } from "@/lib/i18n/format";
import type { UiLocale } from "@/lib/i18n/ui";

const dateLabel: Record<UiLocale, string> = {
  en: "Date",
  ku: "بەروار",
  bd: "ڕێکەفت",
  ar: "التاريخ",
};

const localizedDigitPattern = "0-9٠-٩۰-۹";

function numericScheduleDate(day: string, locale: UiLocale) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return "";
  const [, year, month, date] = match;
  return localizeDigits(`${date}/${month}/${year}`, locale);
}

function extractClock(value: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  const clock = new RegExp(`([${localizedDigitPattern}]{1,2}:[${localizedDigitPattern}]{2})(?:\\s+([^,،]+))?$`, "u").exec(clean);
  if (clock) return `${clock[1]}${clock[2] ? ` ${clock[2].trim()}` : ""}`.trim();
  const fallback = new RegExp(`[${localizedDigitPattern}]{1,2}:[${localizedDigitPattern}]{2}`, "u").exec(clean);
  return fallback?.[0] ?? clean;
}

function ensureDateAndTime(row: HTMLElement, locale: UiLocale, day: string) {
  const details = row.querySelector<HTMLElement>(".polished-details");
  if (!details) return;

  const timeValue = details.querySelector<HTMLElement>(".appointment-time-value");
  const timeDetail = timeValue?.parentElement instanceof HTMLElement ? timeValue.parentElement : null;
  if (!timeValue || !timeDetail) return;

  const scheduleDate = numericScheduleDate(day, locale);
  if (!scheduleDate) return;

  if (!timeValue.dataset.atlasSeparatedClock) {
    timeValue.textContent = extractClock(timeValue.textContent ?? "");
    timeValue.dataset.atlasSeparatedClock = "1";
    timeValue.setAttribute("dir", "ltr");
    timeValue.setAttribute("role", "text");
  }
  timeDetail.classList.add("appointment-time-detail");

  let dateDetail = details.querySelector<HTMLElement>(".appointment-date-detail");
  if (!dateDetail) {
    dateDetail = document.createElement("div");
    dateDetail.className = "appointment-date-detail";
    const term = document.createElement("dt");
    term.textContent = dateLabel[locale];
    const value = document.createElement("dd");
    value.className = "appointment-date-value";
    value.setAttribute("dir", "ltr");
    value.setAttribute("role", "text");
    dateDetail.append(term, value);
    details.insertBefore(dateDetail, timeDetail);
  }

  const dateValue = dateDetail.querySelector<HTMLElement>(".appointment-date-value");
  if (dateValue && dateValue.textContent !== scheduleDate) dateValue.textContent = scheduleDate;
}

function ensureCollapsedSummary(row: HTMLElement) {
  const summary = row.querySelector<HTMLButtonElement>(".atlas-phone-appointment-summary");
  const identity = summary?.querySelector<HTMLElement>(".atlas-phone-appointment-identity");
  const sourcePhone = row.querySelector<HTMLElement>(".patient-cell bdi[dir=\"ltr\"]");
  const sourceTime = row.querySelector<HTMLElement>(".appointment-time-value");
  if (!summary || !identity || !sourcePhone) return;

  let phone = identity.querySelector<HTMLElement>(".atlas-phone-appointment-phone");
  if (!phone) {
    phone = document.createElement("span");
    phone.className = "atlas-phone-appointment-phone";
    phone.setAttribute("dir", "ltr");
    phone.setAttribute("role", "text");
    identity.append(phone);
  }
  const phoneValue = sourcePhone.textContent?.trim() ?? "";
  if (phone.textContent !== phoneValue) phone.textContent = phoneValue;

  const summaryTime = summary.querySelector<HTMLElement>(".atlas-phone-appointment-time");
  const timeValue = sourceTime?.textContent?.trim() ?? "";
  if (summaryTime && timeValue && summaryTime.textContent !== timeValue) {
    summaryTime.textContent = timeValue;
    summaryTime.setAttribute("dir", "ltr");
  }
}

function polishDashboard(locale: UiLocale) {
  const workspace = document.querySelector<HTMLElement>(".workspace-page[data-atlas-selected-day]");
  const day = workspace?.dataset.atlasSelectedDay ?? "";
  if (!workspace || !day) return;

  workspace.querySelectorAll<HTMLElement>(".appointments-panel .appointment-row").forEach((row) => {
    ensureDateAndTime(row, locale, day);
    ensureCollapsedSummary(row);
    row.dataset.atlasCardPolish = "1";
  });
}

export function AtlasAppointmentCardPolish({ locale }: { locale: UiLocale }) {
  useEffect(() => {
    let frame = 0;
    const run = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => polishDashboard(locale));
    };

    run();
    const observer = new MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("popstate", run);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("popstate", run);
    };
  }, [locale]);

  return null;
}
