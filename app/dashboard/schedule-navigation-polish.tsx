"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

function isPlainPrimaryClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

const scheduleLinkSelector = ".day-navigation a[href^='/dashboard?'], .schedule-date-shortcuts a[href^='/dashboard?'], .doctor-schedule-tabs a[href^='/dashboard?']";

export function ScheduleNavigationPolish() {
  const router = useRouter();

  useEffect(() => {
    const prefetchDays = () => {
      document.querySelectorAll<HTMLAnchorElement>(scheduleLinkSelector).forEach((link) => {
        const href = link.getAttribute("href");
        if (href) router.prefetch(href);
      });
    };

    const warmDay = (event: Event) => {
      const target = event.target instanceof Element ? event.target : null;
      const href = target?.closest<HTMLAnchorElement>(scheduleLinkSelector)?.getAttribute("href");
      if (href) router.prefetch(href);
    };

    const handleClick = (event: MouseEvent) => {
      if (!isPlainPrimaryClick(event)) return;
      const target = event.target instanceof Element ? event.target : null;

      const dayLink = target?.closest<HTMLAnchorElement>(scheduleLinkSelector);
      if (dayLink) {
        const href = dayLink.getAttribute("href");
        if (href) {
          event.preventDefault();
          dayLink.closest<HTMLElement>(".day-navigation, .schedule-date-shortcuts, .doctor-schedule-tabs")?.classList.add("is-navigating");
          router.push(href, { scroll: false });
          return;
        }
      }

      const appointmentLink = target?.closest<HTMLAnchorElement>("a[href='#new-appointment']");
      if (!appointmentLink) return;
      const composer = document.getElementById("new-appointment");
      const patientName = document.getElementById("patient_name") as HTMLInputElement | null;
      if (!composer || !patientName) return;
      event.preventDefault();
      composer.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => patientName.focus({ preventScroll: true }), 160);
    };

    prefetchDays();
    document.addEventListener("pointerdown", warmDay, { passive: true });
    document.addEventListener("mouseover", warmDay, { passive: true });
    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("pointerdown", warmDay);
      document.removeEventListener("mouseover", warmDay);
      document.removeEventListener("click", handleClick);
    };
  }, [router]);

  return null;
}
