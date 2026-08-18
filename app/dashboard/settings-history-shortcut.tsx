"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { UiLocale } from "@/lib/i18n/ui";

const copy = {
  en: { eyebrow: "Records", title: "Appointment history", help: "Search old appointments, review removed records, and permanently delete removed records when needed.", open: "Open history" },
  ku: { eyebrow: "تۆمارەکان", title: "مێژووی وادەکان", help: "لە وادە کۆنەکان بگەڕێ، تۆمارە لابراوەکان ببینە، و ئەگەر پێویست بوو بۆ هەمیشە بیانسڕەوە.", open: "مێژوو بکەرەوە" },
  ar: { eyebrow: "السجلات", title: "سجل المواعيد", help: "ابحث في المواعيد القديمة وراجع السجلات المحذوفة واحذفها نهائياً عند الحاجة.", open: "فتح السجل" },
} as const;

export function SettingsHistoryShortcut({ locale }: { locale: UiLocale }) {
  const pathname = usePathname();

  useEffect(() => {
    // History belongs to the main Settings page only. Clinic Access also uses
    // the settings grid layout, but duplicating History there made the page
    // look like a second Settings screen.
    if (pathname !== "/dashboard/settings") return;

    const t = copy[locale];

    const install = () => {
      const grid = document.querySelector<HTMLElement>(".settings-grid");
      if (!grid || grid.querySelector("[data-atlas-history-card]")) return;

      const clinicId = new URLSearchParams(window.location.search).get("clinic");
      const historyHref = clinicId
        ? `/dashboard/history?${new URLSearchParams({ clinic: clinicId })}`
        : "/dashboard/history";

      const card = document.createElement("section");
      card.className = "settings-card settings-link-card settings-history-card";
      card.dataset.atlasHistoryCard = "true";
      card.innerHTML = `
        <div class="settings-card-heading">
          <span class="settings-card-icon" aria-hidden="true">↺</span>
          <div>
            <div class="eyebrow">${t.eyebrow}</div>
            <h2>${t.title}</h2>
            <p>${t.help}</p>
          </div>
        </div>
        <a class="settings-link" href="${historyHref}">
          <span>${t.open}</span><span aria-hidden="true">→</span>
        </a>
      `;

      const account = [...grid.querySelectorAll<HTMLElement>(".settings-card")].find((item) => item.querySelector(".account-email"));
      if (account) grid.insertBefore(card, account);
      else grid.appendChild(card);
    };

    install();
    const observer = new MutationObserver(install);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [locale, pathname]);

  return null;
}
