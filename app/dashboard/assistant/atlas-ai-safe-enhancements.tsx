"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { UiLocale } from "@/lib/i18n/ui";

type Copy = {
  privacy: string;
  examplesLabel: string;
  examples: string[];
  tableLabel: string;
};

const copy: Record<UiLocale, Copy> = {
  en: {
    privacy: "Patient-specific appointment lookups stay inside Atlas and follow your clinic permissions. General medical answers are educational only; Atlas does not invent diagnoses, clinical notes, or patient history.",
    examplesLabel: "Try asking",
    examples: [
      "Show me today's appointments.",
      "How busy is the clinic today?",
      "What should reception focus on today?",
      "How do I change the appointment interval?",
      "Are reminders enabled for this clinic?",
    ],
    tableLabel: "Atlas AI table",
  },
  ku: {
    privacy: "وردەکاری مەوعیدی نەخۆش لە ناو Atlas و بە پێی ڕێگەپێدانەکانی کلینیک دەپشکنرێت. وەڵامی پزیشکی تەنها بۆ زانیاری گشتییە؛ Atlas دەستنیشانکردنی نەخۆشی، تێبینی کلینیکی یان مێژووی نەخۆش دروست ناکات.",
    examplesLabel: "ئەم پرسیارانە تاقی بکەوە",
    examples: [
      "مەوعیدەکانی ئەمڕۆ پیشان بدە.",
      "ئەمڕۆ کلینیک چەند قەرەباڵغە؟",
      "ئەمڕۆ ڕیسێپشن سەرنجی لە چی بدات؟",
      "چۆن ماوەی نێوان مەوعیدەکان بگۆڕم؟",
      "بیرخستنەوە بۆ ئەم کلینیکە چالاکە؟",
    ],
    tableLabel: "خشتەی Atlas AI",
  },
  bd: {
    privacy: "وردەکاریێن مەوعیدێ نەخۆشی ل ناڤ Atlas و ب پێی ڕێپێدانێن کلینیکێ دهێن پشکنین. بەرسڤێن پزیشکی تەنێ بۆ زانیاریا گشتی نە؛ Atlas نەخۆشی، تێبینیێن کلینیکی یان مێژووی نەخۆشی دروست ناکەت.",
    examplesLabel: "ڤان پسیاران تاقی بکە",
    examples: [
      "مەوعیدێن ئەڤرۆ نیشان بدە.",
      "ئەڤرۆ کلینیک چەند قەرەبالغە؟",
      "ئەڤرۆ ڕیسێپشن بالێ خۆ بدەتە چی؟",
      "چەوا ماوەیا ناڤبەرا مەوعیدان بگۆڕم؟",
      "بیرخستنەوە بۆ ڤێ کلینیکێ چالاکە؟",
    ],
    tableLabel: "خشتەیا Atlas AI",
  },
  ar: {
    privacy: "تفاصيل مواعيد المرضى تنفحص داخل Atlas وبحسب صلاحياتك بالعيادة. المعلومات الطبية العامة للتثقيف فقط؛ Atlas ما يخترع تشخيصات أو ملاحظات سريرية أو تاريخ مرضي.",
    examplesLabel: "جرّب سؤال",
    examples: [
      "وريني مواعيد اليوم.",
      "شلون زحمة العيادة اليوم؟",
      "على شنو لازم يركز الاستقبال اليوم؟",
      "شلون أغير الفترة بين المواعيد؟",
      "التذكيرات مفعلة بهاي العيادة؟",
    ],
    tableLabel: "جدول Atlas AI",
  },
};

function parseTableRow(value: string) {
  const line = value.trim();
  if (!line.startsWith("|") || !line.endsWith("|")) return null;
  const cells = line.slice(1, -1).split("|").map((cell) => cell.trim());
  return cells.length >= 2 ? cells : null;
}

function isSeparator(cells: string[] | null) {
  return Boolean(cells?.length && cells.every((cell) => /^:?-{3,}:?$/.test(cell)));
}

function buildTable(header: string[], rows: string[][], label: string) {
  const wrapper = document.createElement("div");
  wrapper.className = "atlas-ai-safe-table-wrap";
  wrapper.setAttribute("role", "region");
  wrapper.setAttribute("aria-label", label);
  wrapper.tabIndex = 0;

  const table = document.createElement("table");
  table.className = "atlas-ai-safe-table";
  const thead = document.createElement("thead");
  const heading = document.createElement("tr");
  header.forEach((value) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = value;
    heading.append(th);
  });
  thead.append(heading);
  table.append(thead);

  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.append(td);
    });
    tbody.append(tr);
  });
  table.append(tbody);
  wrapper.append(table);
  return wrapper;
}

function enhanceTables(root: HTMLElement, label: string) {
  const richBlocks = root.querySelectorAll<HTMLElement>(".atlas-ai-rich-text:not([data-atlas-safe-table])");
  richBlocks.forEach((rich) => {
    rich.dataset.atlasSafeTable = "1";
    const paragraphs = Array.from(rich.children).filter(
      (node): node is HTMLParagraphElement => node instanceof HTMLParagraphElement,
    );

    for (let index = 0; index < paragraphs.length - 1; index += 1) {
      const header = parseTableRow(paragraphs[index]?.textContent ?? "");
      const separator = parseTableRow(paragraphs[index + 1]?.textContent ?? "");
      if (!header || !isSeparator(separator) || separator?.length !== header.length) continue;

      const rows: string[][] = [];
      const source: HTMLParagraphElement[] = [paragraphs[index], paragraphs[index + 1]];
      let cursor = index + 2;
      while (cursor < paragraphs.length) {
        const row = parseTableRow(paragraphs[cursor]?.textContent ?? "");
        if (!row || row.length !== header.length) break;
        rows.push(row);
        source.push(paragraphs[cursor]);
        cursor += 1;
      }
      if (!rows.length) continue;

      source.forEach((node) => node.classList.add("atlas-ai-safe-table-source"));
      rich.append(buildTable(header, rows, label));
      index = cursor - 1;
    }
  });
}

function askThroughStableComposer(question: string) {
  const textarea = document.querySelector<HTMLTextAreaElement>(".atlas-ai-card .atlas-ai-composer textarea");
  if (!textarea || textarea.disabled) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  if (!setter) return;

  setter.call(textarea, question);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.dispatchEvent(new Event("change", { bubbles: true }));
  queueMicrotask(() => {
    if (!textarea.disabled) textarea.closest<HTMLFormElement>("form")?.requestSubmit();
  });
}

export function AtlasAiSafeEnhancements({ locale }: { locale: UiLocale }) {
  const [emptyTarget, setEmptyTarget] = useState<HTMLElement | null>(null);
  const t = copy[locale];

  useEffect(() => {
    const card = document.querySelector<HTMLElement>(".atlas-ai-card");
    const thread = card?.querySelector<HTMLElement>(".atlas-ai-thread");
    if (!card || !thread) return;

    const sync = () => {
      const nextTarget = thread.querySelector<HTMLElement>(".atlas-ai-empty");
      setEmptyTarget((current) => current === nextTarget ? current : nextTarget);
      enhanceTables(thread, t.tableLabel);
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(thread, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [t.tableLabel]);

  return (
    <>
      <p className="atlas-ai-safe-privacy">{t.privacy}</p>
      {emptyTarget ? createPortal(
        <div className="atlas-ai-safe-examples">
          <span>{t.examplesLabel}</span>
          <div className="atlas-ai-safe-presets">
            {t.examples.map((question) => (
              <button key={question} type="button" onClick={() => askThroughStableComposer(question)}>
                {question}
              </button>
            ))}
          </div>
        </div>,
        emptyTarget,
      ) : null}
      <style jsx global>{`
        .atlas-ai-card > .atlas-ai-privacy{display:none!important}
        .atlas-ai-safe-privacy{margin:0 0 10px;border:1px solid var(--line);border-radius:12px;padding:9px 11px;background:var(--surface-soft);color:var(--muted);font-size:10px;line-height:1.5}
        .atlas-ai-empty > .atlas-ai-presets{display:none!important}
        .atlas-ai-safe-examples{display:grid;justify-items:center;gap:8px;width:min(100%,760px);margin-top:2px}
        .atlas-ai-safe-examples>span{color:var(--muted);font-size:11px;font-weight:760}
        .atlas-ai-safe-presets{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;width:100%}
        .atlas-ai-safe-presets button{min-height:38px;border:1px solid var(--line);border-radius:999px;padding:9px 12px;background:var(--surface-soft);color:var(--ink);font-size:10.5px;font-weight:720;line-height:1.35;white-space:normal;text-wrap:balance;cursor:pointer}
        .atlas-ai-safe-table-source{display:none!important}
        .atlas-ai-safe-table-wrap{width:100%;overflow:auto;border:1px solid var(--line-strong);border-radius:12px;background:var(--surface);margin-top:4px;-webkit-overflow-scrolling:touch}
        .atlas-ai-safe-table{width:100%;border-collapse:collapse;min-width:420px;font-size:12px;line-height:1.45}
        .atlas-ai-safe-table :is(th,td){padding:9px 10px;border-bottom:1px solid var(--line);text-align:start;vertical-align:top}
        .atlas-ai-safe-table th{background:var(--surface-soft);font-weight:850;color:var(--ink)}
        .atlas-ai-safe-table tbody tr:last-child td{border-bottom:0}
        html[dir="rtl"] .atlas-ai-safe-table :is(th,td){text-align:right}
        html[data-theme="dark"] .atlas-ai-safe-table-wrap{background:#10261f;border-color:#33594a}
        html[data-theme="dark"] .atlas-ai-safe-table th{background:#173128}
        @media(prefers-color-scheme:dark){html[data-theme="system"] .atlas-ai-safe-table-wrap{background:#10261f;border-color:#33594a}html[data-theme="system"] .atlas-ai-safe-table th{background:#173128}}
        @media(max-width:720px){.atlas-ai-safe-presets{display:grid;grid-template-columns:1fr}.atlas-ai-safe-table{min-width:360px}}
      `}</style>
    </>
  );
}
