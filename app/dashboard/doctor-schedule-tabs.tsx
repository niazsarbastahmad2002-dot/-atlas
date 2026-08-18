"use client";

import { useLayoutEffect } from "react";
import type { UiLocale } from "@/lib/i18n/ui";

const copy = {
  en: { label: "Doctor schedules", empty: "No appointments for this doctor on this day." },
  ku: { label: "خشتەی پزیشکەکان", empty: "بۆ ئەم پزیشکە لەم ڕۆژە هیچ وادەیەک نییە." },
  ar: { label: "جداول الأطباء", empty: "ماكو مواعيد لهذا الطبيب بهذا اليوم." },
} as const;

type Doctor = { id: string; name: string };

export function DoctorScheduleTabs({ locale }: { locale: UiLocale }) {
  useLayoutEffect(() => {
    let frame = 0;
    let selectedDoctorId = "";

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        install();
      });
    };

    const install = () => {
      const workspace = document.querySelector<HTMLElement>(".workspace-page[data-atlas-clinic]");
      const panel = workspace?.querySelector<HTMLElement>(".appointments-panel");
      const list = panel?.querySelector<HTMLElement>(".appointment-list");
      const doctorSelect = workspace?.querySelector<HTMLSelectElement>("#doctor_id");
      if (!workspace || !panel || !list || !doctorSelect) return;

      const doctors: Doctor[] = Array.from(doctorSelect.options)
        .filter((option) => Boolean(option.value))
        .map((option) => ({ id: option.value, name: option.textContent?.trim() ?? option.value }));
      if (doctors.length <= 1) {
        panel.querySelector("[data-atlas-doctor-tabs]")?.remove();
        return;
      }

      const rows = Array.from(list.querySelectorAll<HTMLElement>(".polished-appointment"));
      const doctorNameForRow = (row: HTMLElement) => {
        const details = Array.from(row.querySelectorAll<HTMLElement>(".polished-details dd"));
        return details[1]?.textContent?.trim() ?? "";
      };

      const counts = new Map<string, number>();
      for (const row of rows) {
        const name = doctorNameForRow(row);
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }

      const clinicId = workspace.dataset.atlasClinic ?? "clinic";
      const memoryKey = `atlas:last-doctor:${clinicId}`;
      if (!selectedDoctorId || !doctors.some((doctor) => doctor.id === selectedDoctorId)) {
        let remembered = "";
        try { remembered = window.localStorage.getItem(memoryKey) ?? ""; } catch {}
        const current = doctorSelect.value;
        selectedDoctorId = doctors.some((doctor) => doctor.id === remembered)
          ? remembered
          : doctors.some((doctor) => doctor.id === current)
            ? current
            : doctors.find((doctor) => (counts.get(doctor.name) ?? 0) > 0)?.id ?? doctors[0].id;
      }

      let tabs = panel.querySelector<HTMLElement>("[data-atlas-doctor-tabs]");
      if (!tabs) {
        tabs = document.createElement("nav");
        tabs.className = "doctor-schedule-tabs";
        tabs.dataset.atlasDoctorTabs = "true";
        tabs.setAttribute("aria-label", copy[locale].label);
        panel.querySelector(".schedule-heading")?.after(tabs);
      }

      const apply = (doctorId: string, syncComposer = true) => {
        const doctor = doctors.find((item) => item.id === doctorId) ?? doctors[0];
        selectedDoctorId = doctor.id;
        try { window.localStorage.setItem(memoryKey, doctor.id); } catch {}

        if (syncComposer && doctorSelect.value !== doctor.id) {
          doctorSelect.value = doctor.id;
          doctorSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }

        let visible = 0;
        let pending = 0;
        let confirmed = 0;
        let completed = 0;
        let noShow = 0;
        let cancelled = 0;
        let queue = 0;

        for (const row of rows) {
          const matches = doctorNameForRow(row) === doctor.name;
          row.hidden = !matches;
          if (!matches) continue;
          visible += 1;
          if (row.querySelector(".status-pending")) pending += 1;
          if (row.querySelector(".status-confirmed")) confirmed += 1;
          if (row.querySelector(".status-completed")) completed += 1;
          if (row.querySelector(".status-no_show")) noShow += 1;
          if (row.querySelector(".status-cancelled")) cancelled += 1;

          const badge = row.querySelector<HTMLElement>(".appointment-order-badge");
          if (badge) {
            queue += 1;
            const label = `#${queue}`;
            if (badge.textContent !== label) badge.textContent = label;
          }
        }

        panel.querySelector<HTMLElement>(".count-pill")!.textContent = String(visible);
        const statValues = workspace.querySelectorAll<HTMLElement>(".workspace-stats .stat strong");
        const values = [visible, pending, confirmed, completed, noShow, cancelled];
        statValues.forEach((value, index) => {
          const next = values[index];
          if (next !== undefined && value.textContent !== String(next)) value.textContent = String(next);
        });

        let empty = panel.querySelector<HTMLElement>("[data-atlas-doctor-empty]");
        if (!empty) {
          empty = document.createElement("div");
          empty.dataset.atlasDoctorEmpty = "true";
          empty.className = "doctor-schedule-empty";
          list.before(empty);
        }
        empty.textContent = copy[locale].empty;
        empty.hidden = visible !== 0;

        tabs?.querySelectorAll<HTMLButtonElement>("button[data-doctor-id]").forEach((button) => {
          const selected = button.dataset.doctorId === doctor.id;
          button.classList.toggle("is-selected", selected);
          button.setAttribute("aria-pressed", String(selected));
        });
      };

      tabs.replaceChildren(...doctors.map((doctor) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.doctorId = doctor.id;
        button.setAttribute("aria-pressed", "false");
        const name = document.createElement("strong");
        name.textContent = doctor.name;
        const count = document.createElement("span");
        count.textContent = String(counts.get(doctor.name) ?? 0);
        button.append(name, count);
        button.addEventListener("click", () => apply(doctor.id));
        return button;
      }));

      if (!doctorSelect.dataset.atlasDoctorTabsBound) {
        doctorSelect.dataset.atlasDoctorTabsBound = "true";
        doctorSelect.addEventListener("change", () => {
          if (doctors.some((doctor) => doctor.id === doctorSelect.value)) apply(doctorSelect.value, false);
        });
      }

      apply(selectedDoctorId);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [locale]);

  return (
    <style jsx global>{`
      .doctor-schedule-tabs {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        margin: 0 0 14px;
        padding: 1px 0 4px;
        scrollbar-width: none;
      }
      .doctor-schedule-tabs::-webkit-scrollbar { display: none; }
      .doctor-schedule-tabs button {
        display: inline-flex;
        flex: 0 0 auto;
        min-height: 42px;
        align-items: center;
        gap: 9px;
        border: 1px solid var(--line-strong);
        border-radius: 999px;
        padding: 8px 13px;
        background: #fff;
        color: var(--ink-soft);
        font: inherit;
        cursor: pointer;
        touch-action: manipulation;
      }
      .doctor-schedule-tabs button strong { font-size: 12px; }
      .doctor-schedule-tabs button span {
        display: inline-grid;
        min-width: 23px;
        height: 23px;
        place-items: center;
        border-radius: 999px;
        background: var(--surface-soft);
        font-size: 10px;
        font-weight: 850;
      }
      .doctor-schedule-tabs button.is-selected {
        border-color: rgba(8,119,90,.28);
        background: var(--accent-soft);
        color: var(--accent);
        box-shadow: 0 2px 10px rgba(8,119,90,.08);
      }
      .doctor-schedule-tabs button.is-selected span { background: #fff; }
      .doctor-schedule-empty {
        margin: 2px 0 12px;
        border: 1px dashed var(--line-strong);
        border-radius: 12px;
        padding: 14px;
        color: var(--muted);
        text-align: center;
        font-size: 11px;
      }
    `}</style>
  );
}
