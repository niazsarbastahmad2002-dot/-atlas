"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { UiLocale } from "@/lib/i18n/ui";

const copy = {
  en: { eyebrow: "Records", title: "Appointment history", help: "Search old appointments, review removed records, and permanently delete removed records when needed.", open: "Open history" },
  ku: { eyebrow: "تۆمارەکان", title: "مێژووی وادەکان", help: "لە وادە کۆنەکان بگەڕێ، تۆمارە لابراوەکان ببینە، و ئەگەر پێویست بوو بۆ هەمیشە بیانسڕەوە.", open: "مێژوو بکەرەوە" },
  bd: { eyebrow: "تۆمار", title: "مێژوویا وادەیان", help: "ل وادەیێن کەڤن بگەڕێ، تۆمارێن لابری ببینە، و ئەگەر پێدڤی بوو بۆ هەمیشە ژێببە.", open: "مێژوویێ ڤەکە" },
  ar: { eyebrow: "السجلات", title: "سجل المواعيد", help: "ابحث في المواعيد القديمة وراجع السجلات المحذوفة واحذفها نهائياً عند الحاجة.", open: "فتح السجل" },
} as const;

function removeHistoryCard() {
  document.querySelectorAll("[data-atlas-history-card]").forEach((element) => element.remove());
}

export function SettingsHistoryShortcut({ locale }: { locale: UiLocale }) {
  const pathname = usePathname();

  useEffect(() => {
    removeHistoryCard();
    if (pathname !== "/dashboard/settings") return;
    let stopped = false;
    let installing = false;

    const install = async () => {
      if (stopped || installing) return;
      const grid = document.querySelector<HTMLElement>(".settings-grid");
      if (!grid || grid.querySelector("[data-atlas-history-card]")) return;
      const clinicId = new URLSearchParams(window.location.search).get("clinic")
        ?? document.querySelector<HTMLInputElement>('input[name="clinic_id"]')?.value
        ?? "";
      if (!clinicId) return;
      installing = true;
      try {
        const response = await fetch(`/api/settings/doctor-workflow?${new URLSearchParams({ clinic_id: clinicId })}`, { credentials: "same-origin", cache: "no-store" });
        if (!response.ok) return;
        const access = await response.json() as { role?: string };
        if (access.role !== "admin" || stopped) return;

        const t = copy[locale];
        const card = document.createElement("section");
        card.className = "settings-card settings-link-card settings-history-card";
        card.dataset.atlasHistoryCard = "true";
        card.innerHTML = `<div class="settings-card-heading"><span class="settings-card-icon" aria-hidden="true">↺</span><div><div class="eyebrow">${t.eyebrow}</div><h2>${t.title}</h2><p>${t.help}</p></div></div><a class="settings-link" href="/dashboard/history?${new URLSearchParams({ clinic: clinicId })}"><span>${t.open}</span><span aria-hidden="true">→</span></a>`;
        const account = [...grid.querySelectorAll<HTMLElement>(".settings-card")].find((item) => item.querySelector(".account-email"));
        if (account) grid.insertBefore(card, account); else grid.appendChild(card);
      } finally { installing = false; }
    };

    void install();
    const observer = new MutationObserver(() => { void install(); });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { stopped = true; observer.disconnect(); removeHistoryCard(); };
  }, [locale, pathname]);

  return null;
}
