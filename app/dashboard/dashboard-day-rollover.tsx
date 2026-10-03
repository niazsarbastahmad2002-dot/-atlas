"use client";

import { useEffect } from "react";
import { scheduleFormIsBusy } from "./schedule-form-busy";

function baghdadDay(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function DashboardDayRollover({
  selectedDay,
  todayAtRender,
}: {
  selectedDay: string;
  todayAtRender: string;
}) {
  useEffect(() => {
    if (selectedDay !== todayAtRender) return;

    const refreshForNewClinicDay = () => {
      const liveDay = baghdadDay(new Date());
      if (liveDay === todayAtRender || scheduleFormIsBusy()) return;

      const url = new URL(window.location.href);
      url.searchParams.set("day", liveDay);
      url.searchParams.delete("notice");
      url.searchParams.delete("error");
      url.searchParams.delete("after");
      window.location.replace(`${url.pathname}?${url.searchParams.toString()}`);
    };

    let timer: number | null = null;
    const stop = () => {
      if (timer === null) return;
      window.clearInterval(timer);
      timer = null;
    };
    const start = () => {
      if (document.visibilityState !== "visible" || timer !== null) return;
      timer = window.setInterval(refreshForNewClinicDay, 30_000);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        stop();
        return;
      }
      refreshForNewClinicDay();
      start();
    };

    if (document.visibilityState === "visible") refreshForNewClinicDay();
    start();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [selectedDay, todayAtRender]);

  return null;
}
