"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

function isPlainPrimaryClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
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

    const warmDay = (event: Event) => {
      const target = event.target instanceof Element ? event.target : null;
      const href = target
        ?.closest<HTMLAnchorElement>(".day-navigation a[href^='/dashboard?']")
        ?.getAttribute("href");
      if (href) router.prefetch(href);
    };

    const handleClick = (event: MouseEvent) => {
      if (!isPlainPrimaryClick(event)) return;
      const target = event.target instanceof Element ? event.target : null;

      const dayLink = target?.closest<HTMLAnchorElement>(".day-navigation a[href^='/dashboard?']");
      if (dayLink) {
        const href = dayLink.getAttribute("href");
        if (href) {
          event.preventDefault();
          dayLink.closest<HTMLElement>(".day-navigation")?.classList.add("is-navigating");
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

    // The server already renders Today / Yesterday / Tomorrow and the Cancelled
    // stat. Do not mutate those DOM nodes client-side: repeatedly rewriting them
    // can create a MutationObserver feedback loop in Safari and starve tap events.
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
