"use client";

import { useEffect } from "react";
import {
  MIN_PHONE_SEARCH_DIGITS,
  nameMatchScore,
  normalizeName,
  normalizePhone,
  searchMode,
  type SearchMode,
} from "@/lib/mobile-appointment-search";
import type { UiLocale } from "@/lib/i18n/ui";

const copy = {
  en: {
    search: "Search appointments",
    placeholder: "Patient name or phone number",
    noResults: "No matching appointments",
    expand: "Open appointment",
    collapse: "Close appointment",
    clear: "Clear search",
    nameMode: "Name",
    phoneMode: "Phone",
    phoneHint: "Enter at least 3 digits to search by phone",
    appointment: "appointment",
    appointments: "appointments",
  },
  ku: {
    search: "گەڕان لە وادەکان",
    placeholder: "ناوی نەخۆش یان ژمارەی مۆبایل",
    noResults: "هیچ وادەیەک نەدۆزرایەوە",
    expand: "وادەکە بکەرەوە",
    collapse: "وادەکە دابخە",
    clear: "گەڕان پاک بکەرەوە",
    nameMode: "ناو",
    phoneMode: "ژمارە",
    phoneHint: "بۆ گەڕان بە ژمارە لانیکەم ٣ ژمارە بنووسە",
    appointment: "وادە",
    appointments: "وادە",
  },
  bd: {
    search: "لێگەڕین ل وادەیان",
    placeholder: "ناڤێ نەخۆشی یان ژمارا موبایلێ",
    noResults: "چ وادە نەهاتە دیتن",
    expand: "وادەیێ ڤەکە",
    collapse: "وادەیێ داخە",
    clear: "لێگەڕینێ پاک بکە",
    nameMode: "ناڤ",
    phoneMode: "ژمارە",
    phoneHint: "بۆ لێگەڕینا ب ژمارەیێ کێمترین ٣ ژمارە بنڤیسە",
    appointment: "وادە",
    appointments: "وادە",
  },
  ar: {
    search: "بحث بالمواعيد",
    placeholder: "اسم المريض أو رقم الهاتف",
    noResults: "لا توجد مواعيد مطابقة",
    expand: "فتح الموعد",
    collapse: "إغلاق الموعد",
    clear: "مسح البحث",
    nameMode: "الاسم",
    phoneMode: "الهاتف",
    phoneHint: "اكتب 3 أرقام على الأقل للبحث بالهاتف",
    appointment: "موعد",
    appointments: "مواعيد",
  },
} as const;

function compactTime(value: string) {
  const match = value.match(/[0-9٠-٩۰-۹]{1,2}:[0-9٠-٩۰-۹]{2}/);
  return match?.[0] ?? value.trim();
}

function statusClass(value: string | undefined) {
  return ["pending", "confirmed", "completed", "no_show", "cancelled"].includes(value ?? "") ? value! : "pending";
}

function setText(node: HTMLElement | null, value: string) {
  if (node && node.textContent !== value) node.textContent = value;
}

function searchIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4.2 4.2"></path></svg>`;
}

function clearIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"></path></svg>`;
}

function currentScheduleKey() {
  const url = new URL(window.location.href);
  return [url.pathname, url.searchParams.get("clinic") ?? "", url.searchParams.get("day") ?? "", url.searchParams.get("doctor") ?? ""].join("|");
}

export function MobileAppointmentExperience({ locale }: { locale: UiLocale }) {
  useEffect(() => {
    const text = copy[locale];
    let query = "";
    let composing = false;
    let lastScheduleKey = currentScheduleKey();
    let prepareFrame = 0;

    const updateSummary = (row: HTMLElement) => {
      const summary = row.querySelector<HTMLButtonElement>(".atlas-phone-appointment-summary");
      if (!summary) return;

      const name = row.querySelector<HTMLElement>(".patient-cell strong")?.textContent?.trim() ?? "";
      const phone = row.querySelector<HTMLElement>(".patient-cell span")?.textContent?.trim() ?? "";
      const timeText = row.dataset.atlasCompactTime ?? row.querySelector<HTMLElement>(".appointment-time-value")?.textContent ?? "";
      const order = row.querySelector<HTMLElement>(".appointment-order-badge")?.textContent?.trim() ?? "";
      const select = row.querySelector<HTMLSelectElement>(".appointment-status-select");
      const status = statusClass(select?.value);
      const statusLabel = select?.selectedOptions[0]?.textContent?.trim() ?? "";
      const nameSearch = normalizeName(name);
      const phoneSearch = normalizePhone(phone);

      if (row.dataset.atlasPhoneName !== nameSearch) row.dataset.atlasPhoneName = nameSearch;
      if (row.dataset.atlasPhonePhone !== phoneSearch) row.dataset.atlasPhonePhone = phoneSearch;
      if (row.dataset.atlasPhoneStatus !== status) row.dataset.atlasPhoneStatus = status;

      setText(summary.querySelector<HTMLElement>(".atlas-phone-appointment-time"), compactTime(timeText));
      setText(summary.querySelector<HTMLElement>(".atlas-phone-appointment-name"), name);
      setText(summary.querySelector<HTMLElement>(".atlas-phone-appointment-phone"), phone);
      const statusNode = summary.querySelector<HTMLElement>(".atlas-phone-appointment-status");
      if (statusNode) {
        setText(statusNode, statusLabel);
        const nextClass = `atlas-phone-appointment-status is-${status}`;
        if (statusNode.className !== nextClass) statusNode.className = nextClass;
      }
      const orderNode = summary.querySelector<HTMLElement>(".atlas-phone-appointment-order");
      if (orderNode) {
        setText(orderNode, order);
        orderNode.hidden = !order;
      }
    };

    const updateSearchChrome = (panel: HTMLElement, mode: SearchMode, visible: number, isActive: boolean, phoneTooShort: boolean) => {
      const input = panel.querySelector<HTMLInputElement>(".atlas-phone-appointment-search input");
      const clear = panel.querySelector<HTMLButtonElement>(".atlas-phone-search-clear");
      const meta = panel.querySelector<HTMLElement>(".atlas-phone-search-meta");
      const modeNode = panel.querySelector<HTMLElement>(".atlas-phone-search-mode");
      const countNode = panel.querySelector<HTMLElement>(".atlas-phone-search-count");

      if (clear) clear.hidden = !input?.value;
      if (!meta || !modeNode || !countNode) return;

      if (!isActive) {
        meta.hidden = true;
        return;
      }

      meta.hidden = false;
      setText(modeNode, mode === "phone" ? text.phoneMode : text.nameMode);
      if (phoneTooShort) {
        setText(countNode, text.phoneHint);
      } else {
        const noun = visible === 1 ? text.appointment : text.appointments;
        setText(countNode, `${visible} ${noun}`);
      }
    };

    const applyFilter = (list: HTMLElement) => {
      const panel = list.closest<HTMLElement>(".appointments-panel");
      if (!panel) return;

      const mode = searchMode(query);
      const nameQuery = normalizeName(query);
      const phoneDigits = normalizePhone(query);
      const phoneTooShort = mode === "phone" && phoneDigits.length < MIN_PHONE_SEARCH_DIGITS;
      const activeFilter = mode === "name" ? Boolean(nameQuery) : mode === "phone" && !phoneTooShort;
      const rows = Array.from(list.querySelectorAll<HTMLElement>(".appointment-row"));

      const scored = rows.map((row) => {
        if (!activeFilter) return { row, score: 1 };
        if (mode === "phone") {
          return { row, score: (row.dataset.atlasPhonePhone ?? "").includes(phoneDigits) ? 1 : 0 };
        }
        return { row, score: nameMatchScore(row.dataset.atlasPhoneName ?? "", nameQuery) };
      });
      const bestNameScore = mode === "name" && activeFilter
        ? scored.reduce((best, item) => Math.max(best, item.score), 0)
        : 1;
      const matches: HTMLElement[] = [];

      for (const { row, score } of scored) {
        row.classList.remove("is-atlas-phone-search-focus");
        const isMatch = !activeFilter || (mode === "name" ? score > 0 && score === bestNameScore : score > 0);
        row.classList.toggle("is-atlas-phone-search-hidden", activeFilter && !isMatch);
        row.classList.toggle("is-atlas-phone-search-match", activeFilter && isMatch);
        if (isMatch) matches.push(row);
      }

      if (activeFilter && matches.length === 1) matches[0]?.classList.add("is-atlas-phone-search-focus");

      const empty = panel.querySelector<HTMLElement>(".atlas-phone-search-empty");
      if (empty) empty.hidden = !activeFilter || matches.length > 0;
      updateSearchChrome(panel, mode, matches.length, mode !== "idle", phoneTooShort);
    };

    const prepareRow = (row: HTMLElement, list: HTMLElement) => {
      row.classList.add("is-atlas-phone-managed");
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
        const phoneNode = document.createElement("bdi");
        phoneNode.className = "atlas-phone-appointment-phone";
        phoneNode.dir = "ltr";
        identity.append(name, order, phoneNode);
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
        const search = document.createElement("div");
        search.className = "atlas-phone-appointment-search";
        search.setAttribute("role", "search");

        const label = document.createElement("label");
        label.className = "sr-only";
        const inputId = `atlas-phone-appointment-search-${Math.random().toString(36).slice(2)}`;
        label.htmlFor = inputId;
        label.textContent = text.search;

        const icon = document.createElement("span");
        icon.className = "atlas-phone-search-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.innerHTML = searchIcon();

        const input = document.createElement("input");
        input.id = inputId;
        input.type = "search";
        input.inputMode = "search";
        input.autocomplete = "off";
        input.enterKeyHint = "search";
        input.spellcheck = false;
        input.placeholder = text.placeholder;
        input.value = query;

        const clear = document.createElement("button");
        clear.type = "button";
        clear.className = "atlas-phone-search-clear";
        clear.setAttribute("aria-label", text.clear);
        clear.innerHTML = clearIcon();
        clear.hidden = true;

        const currentList = () => panel.querySelector<HTMLElement>(".polished-appointment-list");
        const commitInput = () => {
          query = input.value;
          const activeList = currentList();
          if (activeList) applyFilter(activeList);
        };
        input.addEventListener("compositionstart", () => {
          composing = true;
        });
        input.addEventListener("compositionend", () => {
          composing = false;
          commitInput();
        });
        input.addEventListener("input", () => {
          if (!composing) commitInput();
        });
        clear.addEventListener("click", () => {
          query = "";
          input.value = "";
          const activeList = currentList();
          if (activeList) applyFilter(activeList);
          input.focus();
        });

        search.append(label, icon, input, clear);
        list.before(search);

        const meta = document.createElement("div");
        meta.className = "atlas-phone-search-meta";
        meta.hidden = true;
        meta.setAttribute("aria-live", "polite");
        const mode = document.createElement("span");
        mode.className = "atlas-phone-search-mode";
        const count = document.createElement("span");
        count.className = "atlas-phone-search-count";
        meta.append(mode, count);
        search.after(meta);

        const empty = document.createElement("p");
        empty.className = "atlas-phone-search-empty";
        empty.textContent = text.noResults;
        empty.hidden = true;
        empty.setAttribute("aria-live", "polite");
        meta.after(empty);
      }

      list.querySelectorAll<HTMLElement>(".appointment-row").forEach((row) => prepareRow(row, list));
      applyFilter(list);
    };

    const resetSearchForScheduleChange = () => {
      const nextKey = currentScheduleKey();
      if (nextKey === lastScheduleKey) return;
      lastScheduleKey = nextKey;
      query = "";
      composing = false;
      document.querySelectorAll<HTMLInputElement>(".atlas-phone-appointment-search input").forEach((input) => {
        input.value = "";
      });
    };

    const prepare = () => {
      resetSearchForScheduleChange();
      document.querySelectorAll<HTMLElement>(".polished-appointment-list").forEach(prepareList);
    };

    const schedulePrepare = () => {
      if (prepareFrame) return;
      prepareFrame = window.requestAnimationFrame(() => {
        prepareFrame = 0;
        prepare();
      });
    };

    const onChange = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement) || !target.matches(".appointment-status-select")) return;
      const row = target.closest<HTMLElement>(".appointment-row");
      if (row) updateSummary(row);
    };

    prepare();
    document.addEventListener("change", onChange);
    const observer = new MutationObserver(schedulePrepare);
    observer.observe(document.querySelector(".app-content") ?? document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (prepareFrame) window.cancelAnimationFrame(prepareFrame);
      document.removeEventListener("change", onChange);
    };
  }, [locale]);

  return null;
}
