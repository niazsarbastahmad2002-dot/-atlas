"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { baghdadDate } from "@/lib/i18n/config";
import { clinicPriorities, type ClinicAttentionAppointment } from "@/lib/clinic-priorities";

type Props = {
  appointments: ClinicAttentionAppointment[];
  selectedDay: string;
  nowAtRender: number;
  summary: ReactNode;
  children: ReactNode;
};

export function ClinicArrivalDisclosure({ appointments, selectedDay, nowAtRender, summary, children }: Props) {
  const [now, setNow] = useState(nowAtRender);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const isToday = baghdadDate.format(new Date(now)) === selectedDay;
  const hasImmediatePriority = clinicPriorities(appointments, now, isToday).length > 0;
  const lastPriorityRef = useRef(hasImmediatePriority);

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 30_000);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  useEffect(() => {
    if (lastPriorityRef.current === hasImmediatePriority) return;
    lastPriorityRef.current = hasImmediatePriority;
    if (detailsRef.current) detailsRef.current.open = !hasImmediatePriority;
  }, [hasImmediatePriority]);

  return <details ref={detailsRef} className="clinic-arrival-disclosure" open={!hasImmediatePriority}>
    <summary className="clinic-arrival-disclosure-summary">{summary}</summary>
    {children}
  </details>;
}
