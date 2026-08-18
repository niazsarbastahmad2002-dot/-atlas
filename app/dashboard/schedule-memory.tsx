"use client";

import { useEffect } from "react";

const scheduleMemoryKey = "atlas:last-schedule-href";

export function ScheduleMemory({ href, fallbackHref, remember }: { href: string; fallbackHref: string; remember: boolean }) {
  useEffect(() => {
    try {
      window.localStorage.setItem(scheduleMemoryKey, remember ? href : fallbackHref);
    } catch {}
  }, [fallbackHref, href, remember]);

  return null;
}
