"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

function isPlainPrimaryClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function ScheduleNavigationPolish() {
  const router = useRouter();

  useEffect(() => {
    let cleanup: Array<() => void> = [];

    const wire = () => {
      cleanup.forEach((fn) => fn());
      cleanup = [];

      const dayLinks = [...document.querySelectorAll<HTMLAnchorElement>(".day-navigation a[href^='/dashboard?']")];
      dayLinks.forEach((link) => {
        router.prefetch(link.href);
        const warm = () => router.prefetch(link.href);
        const go = (event: MouseEvent) => {
          if (!isPlainPrimaryClick(event)) return;
          event.preventDefault();
          const nav = link.closest<HTMLElement>(".day-navigation");
          nav?.classList.add("is-navigating");
          router.push(link.href, { scroll: false });
        };
        link.addEventListener("pointerdown", warm, { passive: true });
        link.addEventListener("mouseenter", warm, { passive: true });
        link.addEventListener("click", go);
        cleanup.push(() => {
          link.removeEventListener("pointerdown", warm);
          link.removeEventListener("mouseenter", warm);
          link.removeEventListener("click", go);
        });
      });

      const appointmentLinks = [...document.querySelectorAll<HTMLAnchorElement>("a[href='#new-appointment']")];
      appointmentLinks.forEach((link) => {
        const focusForm = (event: MouseEvent) => {
          if (!isPlainPrimaryClick(event)) return;
          const composer = document.getElementById("new-appointment");
          const patientName = document.getElementById("patient_name") as HTMLInputElement | null;
          if (!composer || !patientName) return;
          event.preventDefault();
          composer.scrollIntoView({ behavior: "smooth", block: "start" });
          window.setTimeout(() => patientName.focus({ preventScroll: true }), 260);
        };
        link.addEventListener("click", focusForm);
        cleanup.push(() => link.removeEventListener("click", focusForm));
      });
    };

    wire();
    const observer = new MutationObserver(() => wire());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cleanup.forEach((fn) => fn());
    };
  }, [router]);

  return null;
}
