"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect } from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import { flushSettingWrites, hasPendingSettingWrite, needsFreshSettingNavigation, queueSettingWrite } from "./setting-write-barrier";

const scheduleMemoryKey = "atlas:last-schedule-href";

function rememberedSchedule() {
  try {
    const href = window.localStorage.getItem(scheduleMemoryKey);
    return href?.startsWith("/dashboard") ? href : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

function rememberedDoctorId() {
  try {
    const href = rememberedSchedule();
    const url = new URL(href, window.location.origin);
    return url.searchParams.get("doctor") ?? "";
  } catch {
    return "";
  }
}

type DoctorWorkflow = {
  doctorId: string;
  doctorName: string;
  doctors: Array<{ id: string; name: string }>;
  appointmentIntervalMinutes: number;
};

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
            method: "POST", credentials: "same-origin", cache: "no-store", keepalive: true,
            headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: value }),
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

    const clinicIdFor = (select: HTMLSelectElement) => select.form?.querySelector<HTMLInputElement>('input[name="clinic_id"]')?.value
      ?? new URLSearchParams(window.location.search).get("clinic")
      ?? "";

    const loadDoctorWorkflow = async (select: HTMLSelectElement, requestedDoctorId = "") => {
      const clinicId = clinicIdFor(select);
      if (!clinicId) return null;
      const params = new URLSearchParams({ clinic_id: clinicId });
      const doctorId = requestedDoctorId || select.dataset.atlasDoctorId || rememberedDoctorId();
      if (doctorId) params.set("doctor_id", doctorId);
      const response = await fetch(`/api/settings/doctor-workflow?${params}`, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) return null;
      const data = await response.json() as DoctorWorkflow;
      if (!data.doctorId || !Number.isFinite(data.appointmentIntervalMinutes)) return null;
      select.dataset.atlasDoctorId = data.doctorId;
      select.dataset.atlasLastSaved = String(data.appointmentIntervalMinutes);
      select.value = String(data.appointmentIntervalMinutes);
      select.disabled = false;

      const label = select.form?.querySelector<HTMLLabelElement>('label[for="appointment_interval_minutes"]');
      if (label) {
        const base = label.dataset.atlasBaseLabel ?? label.textContent?.split(" · ")[0]?.trim() ?? "Default appointment interval";
        label.dataset.atlasBaseLabel = base;
        label.textContent = `${base} · ${data.doctorName}`;
      }

      if (data.doctors.length > 1 && select.form && !select.form.querySelector("[data-atlas-doctor-settings-picker]")) {
        const wrapper = document.createElement("label");
        wrapper.dataset.atlasDoctorSettingsPicker = "true";
        wrapper.className = "atlas-doctor-settings-picker";
        const caption = document.createElement("span");
        caption.textContent = document.documentElement.dir === "rtl" ? "پزیشک" : "Doctor";
        const picker = document.createElement("select");
        for (const doctor of data.doctors) {
          const option = document.createElement("option");
          option.value = doctor.id;
          option.textContent = doctor.name;
          option.selected = doctor.id === data.doctorId;
          picker.appendChild(option);
        }
        picker.addEventListener("change", () => { void loadDoctorWorkflow(select, picker.value); });
        wrapper.append(caption, picker);
        select.form.insertBefore(wrapper, label ?? select);
      } else {
        const picker = select.form?.querySelector<HTMLSelectElement>("[data-atlas-doctor-settings-picker] select");
        if (picker) picker.value = data.doctorId;
      }
      return data;
    };

    const bindInterval = (select: HTMLSelectElement) => {
      if (prepared.has(select)) return;
      prepared.add(select);
      void loadDoctorWorkflow(select);

      select.addEventListener("change", (event) => {
        event.stopImmediatePropagation();
        const value = Number(select.value);
        const version = nextVersion(select);
        const previous = select.dataset.atlasLastSaved ?? String(value);
        const clinicId = clinicIdFor(select);
        const doctorId = select.dataset.atlasDoctorId ?? "";
        if (!clinicId || !doctorId) {
          select.value = previous;
          return;
        }
        void queueSettingWrite(async () => {
          const response = await fetch("/api/settings/doctor-workflow", {
            method: "POST", credentials: "same-origin", cache: "no-store", keepalive: true,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clinicId, doctorId, appointmentIntervalMinutes: value }),
          });
          if (!response.ok) throw new Error("interval_update_failed");
          const saved = await response.json() as { appointmentIntervalMinutes?: number };
          if (saved.appointmentIntervalMinutes !== value) throw new Error("interval_not_persisted");
          if (version === versions.get(select)) {
            select.dataset.atlasLastSaved = String(value);
            router.refresh();
          }
        }).catch(() => {
          if (version !== versions.get(select)) return;
          select.value = previous;
        });
      }, true);
    };

    const install = () => {
      const locale = document.querySelector<HTMLSelectElement>("#locale");
      if (locale) bindLocale(locale);
      const interval = document.querySelector<HTMLSelectElement>("#appointment_interval_minutes");
      if (interval) bindInterval(interval);
    };

    const handleSettingsBack = async (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest<HTMLAnchorElement>(".settings-heading a[href^='/dashboard']");
      if (!link || link.getAttribute("href")?.includes("/settings")) return;
      event.preventDefault();
      const href = rememberedSchedule();
      if (hasPendingSettingWrite() || needsFreshSettingNavigation()) {
        await flushSettingWrites();
        window.location.assign(href);
        return;
      }
      router.prefetch(href);
      router.push(href, { scroll: true });
    };

    install();
    const observer = new MutationObserver(install);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", handleSettingsBack);
    return () => { observer.disconnect(); document.removeEventListener("click", handleSettingsBack); };
  }, [router]);

  return null;
}
