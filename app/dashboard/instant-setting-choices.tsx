"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect } from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import { queueSettingWrite } from "./setting-write-barrier";

const scheduleMemoryKey = "atlas:last-schedule-href";

function rememberedSchedule() {
  try {
    const href = window.localStorage.getItem(scheduleMemoryKey);
    return href?.startsWith("/dashboard") ? href : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

export function InstantSettingChoices() {
  const router = useRouter();

  useLayoutEffect(() => {
    const prepared = new WeakSet<HTMLSelectElement>();
    const versions = new WeakMap<HTMLSelectElement, number>();

    const nextVersion = (select: HTMLSelectElement) => {
      const version = (versions.get(select) ?? 0) + 1;
      versions.set(select, version);
      return version;
    };

    const bindLocale = (select: HTMLSelectElement) => {
      if (prepared.has(select)) return;
      prepared.add(select);
      select.dataset.atlasLastSaved = select.value;

      select.addEventListener("change", (event) => {
        event.stopImmediatePropagation();
        const value = select.value as UiLocale;
        const version = nextVersion(select);
        const previous = select.dataset.atlasLastSaved ?? "en";

        document.documentElement.lang = value === "ku" ? "ckb" : value;
        document.documentElement.dir = value === "en" ? "ltr" : "rtl";

        void queueSettingWrite(async () => {
          const response = await fetch("/api/ui-language", {
            method: "POST",
            credentials: "same-origin",
            cache: "no-store",
            keepalive: true,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ locale: value }),
          });
          if (!response.ok) throw new Error("language_update_failed");
          if (version === versions.get(select)) {
            select.dataset.atlasLastSaved = value;
            router.refresh();
          }
        }).catch(() => {
          if (version !== versions.get(select)) return;
          select.value = previous;
          document.documentElement.lang = previous === "ku" ? "ckb" : previous;
          document.documentElement.dir = previous === "en" ? "ltr" : "rtl";
        });
      }, true);
    };

    const bindInterval = (select: HTMLSelectElement) => {
      if (prepared.has(select)) return;
      prepared.add(select);
      select.dataset.atlasLastSaved = select.value;

      select.addEventListener("change", (event) => {
        event.stopImmediatePropagation();
        const value = select.value;
        const version = nextVersion(select);
        const previous = select.dataset.atlasLastSaved ?? value;
        const clinicId = select.form?.querySelector<HTMLInputElement>('input[name="clinic_id"]')?.value ?? "";

        void queueSettingWrite(async () => {
          const response = await fetch("/api/settings/clinic", {
            method: "POST",
            credentials: "same-origin",
            cache: "no-store",
            keepalive: true,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clinicId, appointmentIntervalMinutes: Number(value) }),
          });
          if (!response.ok) throw new Error("interval_update_failed");
          const saved = await response.json() as { appointmentIntervalMinutes?: number };
          if (saved.appointmentIntervalMinutes !== Number(value)) throw new Error("interval_not_persisted");
          if (version === versions.get(select)) {
            select.dataset.atlasLastSaved = value;
            // Sync the server-rendered Settings tree to the value that the
            // database just returned. Navigation still forces a fresh page so
            // an older prefetched Schedule can never reappear.
            router.refresh();
          }
        }).catch(() => {
          if (version !== versions.get(select)) return;
          select.value = previous;
        });
      }, true);
    };

    const bindRole = (select: HTMLSelectElement) => {
      if (prepared.has(select)) return;
      prepared.add(select);
      select.addEventListener("change", (event) => {
        event.stopImmediatePropagation();
        select.form?.requestSubmit();
      }, true);
    };

    const install = () => {
      const locale = document.querySelector<HTMLSelectElement>("#locale");
      if (locale) bindLocale(locale);

      const interval = document.querySelector<HTMLSelectElement>("#appointment_interval_minutes");
      if (interval) bindInterval(interval);

      document.querySelectorAll<HTMLSelectElement>(".staff-role-actions select[name='role']")
        .forEach(bindRole);
    };

    const handleSettingsBack = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest<HTMLAnchorElement>(".settings-heading a[href^='/dashboard']");
      if (!link || link.getAttribute("href")?.includes("/settings")) return;
      event.preventDefault();
      const href = rememberedSchedule();
      router.prefetch(href);
      router.push(href, { scroll: true });
    };

    install();
    const observer = new MutationObserver(install);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", handleSettingsBack);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", handleSettingsBack);
    };
  }, [router]);

  return null;
}
