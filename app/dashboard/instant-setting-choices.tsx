"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect } from "react";
import type { UiLocale } from "@/lib/i18n/ui";

const scheduleMemoryKey = "atlas:last-schedule-href";

function rememberedSchedule() {
  try {
    const href = window.localStorage.getItem(scheduleMemoryKey);
    return href?.startsWith("/dashboard") ? href : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

function isPlainClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function InstantSettingChoices() {
  const router = useRouter();

  useLayoutEffect(() => {
    const prepared = new WeakSet<HTMLSelectElement>();
    const versions = new WeakMap<HTMLSelectElement, number>();
    let intervalSaveChain: Promise<void> = Promise.resolve();
    let intervalSavePending = false;

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

        void fetch("/api/ui-language", {
          method: "POST",
          credentials: "same-origin",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: value }),
        }).then((response) => {
          if (version !== versions.get(select)) return;
          if (!response.ok) throw new Error("language_update_failed");
          select.dataset.atlasLastSaved = value;
          router.refresh();
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
        intervalSavePending = true;

        // Serialize rapid changes so an older request can never arrive last and
        // overwrite the receptionist's newest choice.
        intervalSaveChain = intervalSaveChain.catch(() => {}).then(async () => {
          const response = await fetch("/api/settings/clinic", {
            method: "POST",
            credentials: "same-origin",
            keepalive: true,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clinicId,
              appointmentIntervalMinutes: Number(value),
            }),
          });
          if (!response.ok) throw new Error("interval_update_failed");
          if (version === versions.get(select)) select.dataset.atlasLastSaved = value;
        }).catch(() => {
          if (version === versions.get(select)) select.value = previous;
        }).finally(() => {
          if (version === versions.get(select)) intervalSavePending = false;
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

    const handleScheduleNavigation = (event: MouseEvent) => {
      if (!isPlainClick(event)) return;
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest<HTMLAnchorElement>('a[href^="/dashboard"]');
      if (!link) return;
      const rawHref = link.getAttribute("href") ?? "";
      if (/\/dashboard\/(settings|staff|history|reminders)/.test(rawHref)) return;

      const fromSettingsHeader = Boolean(link.closest(".settings-heading"));
      if (!fromSettingsHeader && !intervalSavePending) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      link.classList.add("is-active");
      link.setAttribute("aria-busy", intervalSavePending ? "true" : "false");

      const destination = fromSettingsHeader ? rememberedSchedule() : rawHref;
      void (async () => {
        if (intervalSavePending) await intervalSaveChain;
        router.prefetch(destination);
        router.push(destination, { scroll: true });
      })();
    };

    install();
    const observer = new MutationObserver(install);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", handleScheduleNavigation, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", handleScheduleNavigation, true);
    };
  }, [router]);

  return null;
}
