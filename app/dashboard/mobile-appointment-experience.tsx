"use client";

import { useEffect } from "react";
import { toAsciiDigits } from "@/lib/i18n/format";
import type { UiLocale } from "@/lib/i18n/ui";

const copy = {
  en: { search: "Search appointments", placeholder: "Patient name or phone number", noResults: "No matching appointments", expand: "Open appointment", collapse: "Close appointment" },
  ku: { search: "گەڕان لە وادەکان", placeholder: "ناوی نەخۆش یان ژمارەی مۆبایل", noResults: "هیچ وادەیەک نەدۆزرایەوە", expand: "وادەکە بکەرەوە", collapse: "وادەکە دابخە" },
  bd: { search: "لێگەڕین ل وادەیان", placeholder: "ناڤێ نەخۆشی یان ژمارا موبایلێ", noResults: "چ وادە نەهاتە دیتن", expand: "وادەیێ ڤەکە", collapse: "وادەیێ داخە" },
  ar: { search: "بحث بالمواعيد", placeholder: "اسم المريض أو رقم الهاتف", noResults: "لا توجد مواعيد مطابقة", expand: "فتح الموعد", collapse: "إغلاق الموعد" },
} as const;

function normalizeSearch(value: string) {
  return toAsciiDigits(value).toLocaleLowerCase().replace(/[\s()+\-]/g, "");
}

function compactTime(value: string) {
  const match = value.match(/[0-9٠-٩۰-۹]{1,2}:[0-9٠-٩۰-۹]{2}/);
  return match?.[0] ?? value.trim();
}

function statusClass(value: string | undefined) {
  return ["pending", "confirmed", "completed", "no_show", "cancelled"].includes(value ?? "") ? value! : "pending";
}

export function MobileAppointmentExperience({ locale }: { locale: UiLocale }) {
  useEffect(() => {
    const text = copy[locale];
    let query = "";

    const updateSummary = (row: HTMLElement) => {
      const summary = row.querySelector<HTMLButtonElement>(".atlas-phone-appointment-summary");
      if (!summary) return;

      const name = row.querySelector<HTMLElement>(".patient-cell strong")?.textContent?.trim() ?? "";
      const phone = row.querySelector<HTMLElement>(".patient-cell span")?.textContent?.trim() ?? "";
      const timeText = row.querySelector<HTMLElement>(".appointment-time-value")?.textContent ?? "";
      const order = row.querySelector<HTMLElement>(".appointment-order-badge")?.textContent?.trim() ?? "";
      const select = row.querySelector<HTMLSelectElement>(".appointment-status-select");
      const status = statusClass(select?.value);
      const statusLabel = select?.selectedOptions[0]?.textContent?.trim() ?? "";

      row.dataset.atlasPhoneSearch = normalizeSearch(`${name} ${phone}`);
      row.dataset.atlasPhoneStatus = status;

      const time = summary.querySelector<HTMLElement>(".atlas-phone-appointment-time");
      const patient = summary.querySelector<HTMLElement>(".atlas-phone-appointment-name");
      const statusNode = summary.querySelector<HTMLElement>(".atlas-phone-appointment-status");
      const orderNode = summary.querySelector<HTMLElement>(".atlas-phone-appointment-order");
      if (time) time.textContent = compactTime(timeText);
      if (patient) patient.textContent = name;
      if (statusNode) {
        statusNode.textContent = statusLabel;
        statusNode.className = `atlas-phone-appointment-status is-${status}`;
      }
      if (orderNode) {
        orderNode.textContent = order;
        orderNode.hidden = !order;
      }
    };

    const applyFilter = (list: HTMLElement) => {
      const needle = normalizeSearch(query);
      let visible = 0;
      list.querySelectorAll<HTMLElement>(".appointment-row").forEach((row) => {
        const matches = !needle || (row.dataset.atlasPhoneSearch ?? "").includes(needle);
        row.classList.toggle("is-atlas-phone-search-hidden", !matches);
        if (matches) visible += 1;
      });
      const empty = list.parentElement?.querySelector<HTMLElement>(".atlas-phone-search-empty");
      if (empty) empty.hidden = visible > 0 || !needle;
    };

    const prepareRow = (row: HTMLElement, list: HTMLElement) => {
      if (!row.querySelector(".atlas-phone-appointment-summary")) {
        const summary = document.createElement("button");
        summary.type = "button";
        summary.className = "atlas-phone-appointment-summary";
        summary.setAttribute("aria-expanded", "false");
        summary.setAttribute("aria-label", text.expand);

        const time = document.createElement("span");
        time.className = "atlas-phone-appointment-time";
        const identity = document.createElement("span");
        identity.className = "atlas-phone-appointment-identity";
        const name = document.createElement("strong");
        name.className = "atlas-phone-appointment-name";
        const order = document.createElement("small");
        order.className = "atlas-phone-appointment-order";
        identity.append(name, order);
        const status = document.createElement("span");
        status.className = "atlas-phone-appointment-status is-pending";
        const chevron = document.createElement("span");
        chevron.className = "atlas-phone-appointment-chevron";
        chevron.setAttribute("aria-hidden", "true");
        chevron.textContent = "⌄";
        summary.append(time, identity, status, chevron);

        summary.addEventListener("click", () => {
          const willOpen = !row.classList.contains("is-atlas-phone-expanded");
          if (willOpen) {
            list.querySelectorAll<HTMLElement>(".appointment-row.is-atlas-phone-expanded").forEach((other) => {
              if (other === row) return;
              other.classList.remove("is-atlas-phone-expanded");
              const otherSummary = other.querySelector<HTMLButtonElement>(".atlas-phone-appointment-summary");
              otherSummary?.setAttribute("aria-expanded", "false");
              otherSummary?.setAttribute("aria-label", text.expand);
            });
          }
          row.classList.toggle("is-atlas-phone-expanded", willOpen);
          summary.setAttribute("aria-expanded", String(willOpen));
          summary.setAttribute("aria-label", willOpen ? text.collapse : text.expand);
        });

        row.prepend(summary);
      }
      updateSummary(row);
    };

    const prepareList = (list: HTMLElement) => {
      const panel = list.closest<HTMLElement>(".appointments-panel");
      if (!panel) return;

      if (!panel.querySelector(".atlas-phone-appointment-search")) {
        const search = document.createElement("label");
        search.className = "atlas-phone-appointment-search";
        const label = document.createElement("span");
        label.className = "sr-only";
        label.textContent = text.search;
        const icon = document.createElement("span");
        icon.className = "atlas-phone-search-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = "⌕";
        const input = document.createElement("input");
        input.type = "search";
        input.inputMode = "search";
        input.autocomplete = "off";
        input.placeholder = text.placeholder;
        input.value = query;
        input.addEventListener("input", () => {
          query = input.value;
          applyFilter(list);
        });
        search.append(label, icon, input);
        list.before(search);

        const empty = document.createElement("p");
        empty.className = "atlas-phone-search-empty";
        empty.textContent = text.noResults;
        empty.hidden = true;
        search.after(empty);
      }

      list.querySelectorAll<HTMLElement>(".appointment-row").forEach((row) => prepareRow(row, list));
      applyFilter(list);
    };

    const prepare = () => {
      document.querySelectorAll<HTMLElement>(".polished-appointment-list").forEach(prepareList);
    };

    const onChange = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement) || !target.matches(".appointment-status-select")) return;
      const row = target.closest<HTMLElement>(".appointment-row");
      if (row) updateSummary(row);
    };

    prepare();
    document.addEventListener("change", onChange);
    const observer = new MutationObserver(prepare);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      document.removeEventListener("change", onChange);
    };
  }, [locale]);

  return null;
}
