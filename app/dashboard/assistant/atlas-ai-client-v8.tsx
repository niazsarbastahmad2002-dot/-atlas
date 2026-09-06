"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { UiLocale } from "@/lib/i18n/ui";
import { AtlasAiClient as AtlasAiClientV4 } from "./atlas-ai-client-v4";

type AtlasAiClientProps = { clinicId: string; clinicName: string; locale: UiLocale };

type AiCopy = {
  subtitle: string;
  privacy: string;
  examples: string[];
  tableLabel: string;
};

const copy: Record<UiLocale, AiCopy> = {
  en: {
    subtitle: "Ask about Atlas, authorized clinic data, reception work, or general medical information relevant to clinic work.",
    privacy: "Patient-specific appointment lookups stay inside Atlas and follow your clinic permissions. General medical answers are educational only; Atlas does not invent diagnoses, clinical notes, or patient history.",
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
    subtitle: "لەسەر Atlas، زانیاری ڕێگەپێدراوی کلینیک، کاری ڕیسێپشن یان زانیاری پزیشکی گشتیی پەیوەندیدار بە کاری کلینیک بپرسە.",
    privacy: "وردەکاری مەوعیدی نەخۆش لە ناو Atlas و بە پێی ڕێگەپێدانەکانی کلینیک دەپشکنرێت. وەڵامی پزیشکی تەنها بۆ زانیاری گشتییە؛ Atlas دەستنیشانکردنی نەخۆشی، تێبینی کلینیکی یان مێژووی نەخۆش دروست ناکات.",
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
    subtitle: "ل سەر Atlas، زانیاریێن ڕێپێدای یێن کلینیکێ، کارێ ڕیسێپشنێ یان زانیاریێن پزیشکی یێن گشتی یێن پەیوەندیدار ب کارێ کلینیکێ پسیار بکە.",
    privacy: "وردەکاریێن مەوعیدێ نەخۆشی ل ناڤ Atlas و ب پێی ڕێپێدانێن کلینیکێ دهێن پشکنین. بەرسڤێن پزیشکی تەنێ بۆ زانیاریا گشتی نە؛ Atlas نەخۆشی، تێبینیێن کلینیکی یان مێژووی نەخۆشی دروست ناکەت.",
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
    subtitle: "اسأل عن Atlas، بيانات العيادة المسموح لك تشوفها، شغل الاستقبال، أو معلومات طبية عامة تفيد بعمل العيادة.",
    privacy: "تفاصيل مواعيد المرضى تنفحص داخل Atlas وبحسب صلاحياتك بالعيادة. المعلومات الطبية العامة للتثقيف فقط؛ Atlas ما يخترع تشخيصات أو ملاحظات سريرية أو تاريخ مرضي.",
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

function separatorRow(cells: string[] | null) {
  return Boolean(cells?.length && cells.every((cell) => /^:?-{3,}:?$/.test(cell)));
}

function buildTable(header: string[], rows: string[][], label: string) {
  const wrapper = document.createElement("div");
  wrapper.className = "atlas-ai-table-wrap";
  wrapper.setAttribute("role", "region");
  wrapper.setAttribute("aria-label", label);
  wrapper.tabIndex = 0;

  const table = document.createElement("table");
  table.className = "atlas-ai-table";
  const thead = document.createElement("thead");
  const heading = document.createElement("tr");
  for (const value of header) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = value;
    heading.append(th);
  }
  thead.append(heading);
  table.append(thead);

  const tbody = document.createElement("tbody");
  for (const row of rows) {
    const tr = document.createElement("tr");
    for (const value of row) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.append(td);
    }
    tbody.append(tr);
  }
  table.append(tbody);
  wrapper.append(table);
  return wrapper;
}

function enhanceTables(root: HTMLElement, label: string) {
  const richBlocks = root.querySelectorAll<HTMLElement>(".atlas-ai-rich-text:not([data-atlas-table-pass])");
  for (const rich of richBlocks) {
    rich.dataset.atlasTablePass = "1";
    const paragraphs = Array.from(rich.children).filter(
      (node): node is HTMLParagraphElement => node instanceof HTMLParagraphElement,
    );

    for (let index = 0; index < paragraphs.length - 1; index += 1) {
      const header = parseTableRow(paragraphs[index]?.textContent ?? "");
      const separator = parseTableRow(paragraphs[index + 1]?.textContent ?? "");
      if (!header || !separatorRow(separator) || separator?.length !== header.length) continue;

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

      rich.append(buildTable(header, rows, label));
      source.forEach((node) => {
        node.hidden = true;
        node.setAttribute("aria-hidden", "true");
      });
      index = cursor - 1;
    }
  }
}

function askThroughComposer(root: HTMLElement, question: string) {
  const textarea = root.querySelector<HTMLTextAreaElement>(".atlas-ai-composer textarea");
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

export function AtlasAiClient(props: AtlasAiClientProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [presetTarget, setPresetTarget] = useState<HTMLElement | null>(null);
  const t = copy[props.locale];

  useEffect(() => {
    const wrapper = rootRef.current;
    const card = wrapper?.querySelector<HTMLElement>(".atlas-ai-card");
    if (!wrapper || !card) return;
    card.dataset.atlasAiV8 = "true";

    const polish = () => {
      const heading = card.querySelector<HTMLElement>(".atlas-ai-heading > div > p");
      if (heading && heading.textContent !== t.subtitle) heading.textContent = t.subtitle;
      const privacy = card.querySelector<HTMLElement>(".atlas-ai-privacy");
      if (privacy && privacy.textContent !== t.privacy) privacy.textContent = t.privacy;
      enhanceTables(card, t.tableLabel);
      setPresetTarget(card.querySelector<HTMLElement>(".atlas-ai-empty"));
    };

    polish();
    const observer = new MutationObserver(polish);
    observer.observe(card, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [t.privacy, t.subtitle, t.tableLabel]);

  const presets = presetTarget ? createPortal(
    <div className="atlas-ai-presets atlas-ai-presets-v8" aria-label={props.locale === "en" ? "Example questions" : undefined}>
      {t.examples.map((question) => (
        <button key={question} type="button" onClick={() => rootRef.current && askThroughComposer(rootRef.current, question)}>
          {question}
        </button>
      ))}
    </div>,
    presetTarget,
  ) : null;

  return (
    <div className="atlas-ai-v8-shell" ref={rootRef}>
      <AtlasAiClientV4 {...props} />
      {presets}
      <style jsx global>{`
        .atlas-ai-v8-shell .atlas-ai-empty > .atlas-ai-presets:not(.atlas-ai-presets-v8){display:none!important}
        .atlas-ai-v8-shell .atlas-ai-presets-v8{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;width:min(100%,760px);margin-top:2px}
        .atlas-ai-v8-shell .atlas-ai-presets-v8 button{min-height:38px;padding:9px 12px;white-space:normal;line-height:1.35;text-wrap:balance}
        .atlas-ai-v8-shell .atlas-ai-message{width:min(94%,760px)}
        .atlas-ai-v8-shell .atlas-ai-rich-text{gap:8px}
        .atlas-ai-v8-shell .atlas-ai-rich-text h3{margin:8px 0 2px;font-size:15px;line-height:1.35}
        .atlas-ai-v8-shell .atlas-ai-table-wrap{width:100%;overflow:auto;border:1px solid var(--line-strong);border-radius:12px;background:var(--surface);margin-top:4px;-webkit-overflow-scrolling:touch}
        .atlas-ai-v8-shell .atlas-ai-table{width:100%;border-collapse:collapse;min-width:420px;font-size:12px;line-height:1.45}
        .atlas-ai-v8-shell .atlas-ai-table :is(th,td){padding:9px 10px;border-bottom:1px solid var(--line);text-align:start;vertical-align:top}
        .atlas-ai-v8-shell .atlas-ai-table th{background:var(--surface-soft);font-weight:850;color:var(--ink)}
        .atlas-ai-v8-shell .atlas-ai-table tbody tr:last-child td{border-bottom:0}
        html[dir="rtl"] .atlas-ai-v8-shell .atlas-ai-table :is(th,td){text-align:right}
        html[data-theme="dark"] .atlas-ai-v8-shell .atlas-ai-table-wrap{background:#10261f;border-color:#33594a}
        html[data-theme="dark"] .atlas-ai-v8-shell .atlas-ai-table th{background:#173128}
        @media(max-width:720px){.atlas-ai-v8-shell .atlas-ai-presets-v8{display:grid;grid-template-columns:1fr;width:100%}.atlas-ai-v8-shell .atlas-ai-message{width:96%}.atlas-ai-v8-shell .atlas-ai-table{min-width:360px}}
      `}</style>
    </div>
  );
}
