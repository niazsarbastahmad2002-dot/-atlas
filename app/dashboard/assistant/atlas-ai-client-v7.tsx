"use client";

import { useEffect } from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import { AtlasAiClient as StableAtlasAiClient } from "./atlas-ai-client-v4";

type AtlasAiClientProps = { clinicId: string; clinicName: string; locale: UiLocale };

const soraniPresets = [
  "مەوعیدەکانی ئەمڕۆ بە کات و ناوی نەخۆش و دکتۆر پیشان بدە.",
  "مەوعیدەکانی ئەمڕۆی دکتۆر سارا پیشان بدە.",
  "ئەمڕۆ چەند مەوعیدمان هەیە؟",
  "کام مەوعیدەکان هێشتا پشتڕاست نەکراونەتەوە؟",
  "کام نەخۆشەکان بیرخستنەوەیان بۆ نەنێردراوە؟",
  "ئەمڕۆ ڕیسێپشن سەرنجی لە چی بدات؟",
  "خشتەی هەموو مەوعیدەکانی ئەمڕۆ پیشان بدە.",
];

function parseTableRow(value: string) {
  const line = value.trim();
  if (!line.startsWith("|") || !line.endsWith("|")) return null;
  const cells = line.slice(1, -1).split("|").map((cell) => cell.trim());
  return cells.length >= 2 ? cells : null;
}

function separatorRow(cells: string[] | null) {
  return Boolean(cells?.length && cells.every((cell) => /^:?-{3,}:?$/.test(cell)));
}

function buildTable(header: string[], rows: string[][], locale: UiLocale) {
  const wrapper = document.createElement("div");
  wrapper.className = "atlas-ai-table-wrap";
  wrapper.setAttribute("role", "region");
  wrapper.setAttribute(
    "aria-label",
    locale === "ar" ? "جدول Atlas AI" : locale === "en" ? "Atlas AI table" : "خشتەی Atlas AI",
  );
  wrapper.tabIndex = 0;

  const table = document.createElement("table");
  table.className = "atlas-ai-table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const value of header) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = value;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const row of rows) {
    const tr = document.createElement("tr");
    for (const value of row) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrapper.appendChild(table);
  return wrapper;
}

function enhanceTables(root: HTMLElement, locale: UiLocale) {
  const richBlocks = root.querySelectorAll<HTMLElement>(
    ".atlas-ai-rich-text:not([data-atlas-table-pass])",
  );

  for (const rich of richBlocks) {
    rich.dataset.atlasTablePass = "1";
    const paragraphs = Array.from(rich.children).filter(
      (node): node is HTMLParagraphElement => node instanceof HTMLParagraphElement,
    );

    for (let index = 0; index < paragraphs.length - 1; index += 1) {
      const header = parseTableRow(paragraphs[index].textContent ?? "");
      const separator = parseTableRow(paragraphs[index + 1].textContent ?? "");
      if (!header || !separatorRow(separator) || separator?.length !== header.length) continue;

      const tableRows: string[][] = [];
      const sourceNodes: HTMLParagraphElement[] = [paragraphs[index], paragraphs[index + 1]];
      let cursor = index + 2;
      while (cursor < paragraphs.length) {
        const row = parseTableRow(paragraphs[cursor].textContent ?? "");
        if (!row || row.length !== header.length) break;
        tableRows.push(row);
        sourceNodes.push(paragraphs[cursor]);
        cursor += 1;
      }
      if (!tableRows.length) continue;

      rich.appendChild(buildTable(header, tableRows, locale));
      for (const node of sourceNodes) {
        node.hidden = true;
        node.setAttribute("aria-hidden", "true");
      }
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

  // React flushes the controlled textarea update at the end of the input event.
  // A microtask submits after that flush without a timing guess or arbitrary timeout.
  queueMicrotask(() => {
    if (textarea.disabled) return;
    textarea.closest<HTMLFormElement>("form")?.requestSubmit();
  });
}

function polishSorani(root: HTMLElement) {
  const privacy = root.querySelector<HTMLElement>(".atlas-ai-privacy");
  if (privacy) {
    privacy.textContent = "Atlas AI بۆ وەڵامدانەوە لە زانیارییە ڕێگەپێدراوەکانی کلینیک بەکاردەهێنێت. وردەکاری مەوعیدەکان لە ناو Atlas دەپشکنرێت. تکایە زانیاری پزیشکی وەک دەستنیشانکردنی نەخۆشی یان تێبینی پزیشکی لێرە مەنووسە.";
  }

  const empty = root.querySelector<HTMLElement>(".atlas-ai-empty");
  const presets = empty?.querySelector<HTMLElement>(".atlas-ai-presets");
  if (!empty || !presets || presets.dataset.atlasSoraniV7 === "1") return;
  presets.dataset.atlasSoraniV7 = "1";

  const label = Array.from(empty.children).find(
    (node) => node instanceof HTMLSpanElement,
  ) as HTMLSpanElement | undefined;
  if (label) label.textContent = "دەتوانیت بەم پرسیارانە دەست پێ بکەیت";

  presets.replaceChildren();
  for (const question of soraniPresets) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = question;
    button.addEventListener("click", () => askThroughComposer(root, question));
    presets.appendChild(button);
  }
}

export function AtlasAiClient(props: AtlasAiClientProps) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".atlas-ai-card");
    if (!root) return;
    root.dataset.atlasAiClient = "v7";

    let queued = false;
    const run = () => {
      queued = false;
      enhanceTables(root, props.locale);
      if (props.locale === "ku") polishSorani(root);
    };
    const schedule = () => {
      if (queued) return;
      queued = true;
      queueMicrotask(run);
    };

    run();
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      delete root.dataset.atlasAiClient;
    };
  }, [props.locale]);

  return (
    <>
      <StableAtlasAiClient {...props} />
      <style>{`
        .atlas-ai-card[data-atlas-ai-client="v7"]{isolation:isolate}
        .atlas-ai-card[data-atlas-ai-client="v7"] :is(button,textarea){touch-action:manipulation;-webkit-tap-highlight-color:transparent}
        .atlas-ai-card[data-atlas-ai-client="v7"] :is(button,textarea):focus-visible{outline:2px solid var(--accent);outline-offset:2px}
        .atlas-ai-card[data-atlas-ai-client="v7"] .atlas-ai-thread{overscroll-behavior:contain;scroll-padding-block:18px}
        .atlas-ai-card[data-atlas-ai-client="v7"] .atlas-ai-message{overflow-wrap:anywhere}
        .atlas-ai-card[data-atlas-ai-client="v7"] .atlas-ai-message.is-user{unicode-bidi:plaintext}
        .atlas-ai-card[data-atlas-ai-client="v7"] .atlas-ai-rich-text{min-width:0}
        .atlas-ai-card[data-atlas-ai-client="v7"] .atlas-ai-presets{max-width:920px;margin-inline:auto}
        .atlas-ai-card[data-atlas-ai-client="v7"] .atlas-ai-presets button{white-space:normal;line-height:1.4;text-wrap:balance}

        .atlas-ai-table-wrap{width:100%;margin-top:9px;overflow-x:auto;overscroll-behavior-inline:contain;border:1px solid var(--line);border-radius:13px;background:var(--surface);box-shadow:0 1px 2px rgba(15,33,26,.03)}
        .atlas-ai-table{width:100%;min-width:560px;border-collapse:collapse;font-size:11.5px;line-height:1.48;color:var(--ink)}
        .atlas-ai-table th,.atlas-ai-table td{padding:9px 10px;text-align:start;vertical-align:top;border-bottom:1px solid var(--line);border-inline-end:1px solid var(--line);white-space:normal}
        .atlas-ai-table th{background:var(--surface-soft);font-size:10px;font-weight:850;color:var(--ink-soft);white-space:nowrap}
        .atlas-ai-table th:last-child,.atlas-ai-table td:last-child{border-inline-end:0}
        .atlas-ai-table tbody tr:last-child td{border-bottom:0}
        .atlas-ai-table-wrap:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
        [dir="rtl"] .atlas-ai-table{direction:rtl}

        :root[data-theme="dark"] .atlas-ai-table-wrap{background:var(--surface);border-color:var(--line-strong)}
        :root[data-theme="dark"] .atlas-ai-table th{background:var(--surface-soft)}
        @media(prefers-color-scheme:dark){:root[data-theme="system"] .atlas-ai-table-wrap{background:var(--surface);border-color:var(--line-strong)}:root[data-theme="system"] .atlas-ai-table th{background:var(--surface-soft)}}

        @media(min-width:760px){
          .atlas-ai-card[data-atlas-ai-client="v7"] .atlas-ai-presets{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
          .atlas-ai-card[data-atlas-ai-client="v7"] .atlas-ai-presets button{max-width:360px}
        }
        @media(min-width:721px) and (max-width:1400px){
          .atlas-ai-page{width:min(1080px,calc(100% - 32px))}
          .atlas-ai-card[data-atlas-ai-client="v7"]{min-height:calc(100dvh - 205px)}
          .atlas-ai-card[data-atlas-ai-client="v7"] .atlas-ai-thread{max-height:min(58dvh,650px)}
        }
        @media(max-width:720px){
          .atlas-ai-card[data-atlas-ai-client="v7"]{min-height:calc(100dvh - 150px);border-radius:18px;padding:15px}
          .atlas-ai-card[data-atlas-ai-client="v7"] .atlas-ai-heading{gap:10px}
          .atlas-ai-card[data-atlas-ai-client="v7"] .atlas-ai-heading h1{font-size:27px}
          .atlas-ai-card[data-atlas-ai-client="v7"] .atlas-ai-thread{max-height:none;min-height:300px;padding-inline:0}
          .atlas-ai-card[data-atlas-ai-client="v7"] .atlas-ai-message{width:min(94%,690px)}
          .atlas-ai-card[data-atlas-ai-client="v7"] .atlas-ai-presets{display:grid;grid-template-columns:1fr;width:100%;gap:7px}
          .atlas-ai-card[data-atlas-ai-client="v7"] .atlas-ai-presets button{width:100%;max-width:none;text-align:start;border-radius:13px;padding:11px 12px}
          .atlas-ai-table{min-width:520px;font-size:11px}
          .atlas-ai-table th,.atlas-ai-table td{padding:8px}
        }
        @media(prefers-reduced-motion:reduce){.atlas-ai-card[data-atlas-ai-client="v7"] *{scroll-behavior:auto!important}}
      `}</style>
    </>
  );
}
