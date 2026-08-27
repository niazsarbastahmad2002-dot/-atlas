"use client";

import { useEffect } from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import { AtlasAiClient as AtlasAiClientV4 } from "./atlas-ai-client-v4";

type AtlasAiClientProps = { clinicId: string; clinicName: string; locale: UiLocale };

function parseTableRow(value: string) {
  const line = value.trim();
  if (!line.startsWith("|") || !line.endsWith("|")) return null;
  const cells = line.slice(1, -1).split("|").map((cell) => cell.trim());
  return cells.length >= 2 ? cells : null;
}

function separatorRow(cells: string[] | null) {
  return Boolean(cells?.length && cells.every((cell) => /^:?-{3,}:?$/.test(cell)));
}

function buildTable(header: string[], rows: string[][]) {
  const wrapper = document.createElement("div");
  wrapper.className = "atlas-ai-table-wrap";
  wrapper.setAttribute("role", "region");
  wrapper.setAttribute("aria-label", "Atlas AI table");
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

function enhanceTables(root: HTMLElement) {
  const richBlocks = root.querySelectorAll<HTMLElement>(".atlas-ai-rich-text:not([data-atlas-table-pass])");
  for (const rich of richBlocks) {
    rich.dataset.atlasTablePass = "1";
    const paragraphs = Array.from(rich.children).filter((node): node is HTMLParagraphElement => node instanceof HTMLParagraphElement);

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

      const table = buildTable(header, tableRows);
      rich.appendChild(table);
      for (const node of sourceNodes) {
        node.hidden = true;
        node.setAttribute("aria-hidden", "true");
      }
      index = cursor - 1;
    }
  }
}

export function AtlasAiClient(props: AtlasAiClientProps) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".atlas-ai-card");
    if (!root) return;

    let queued = false;
    const run = () => {
      queued = false;
      enhanceTables(root);
    };
    const schedule = () => {
      if (queued) return;
      queued = true;
      queueMicrotask(run);
    };

    run();
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <AtlasAiClientV4 {...props} />
      <style>{`
        .atlas-ai-table-wrap{margin-top:8px;overflow-x:auto;overscroll-behavior-inline:contain;border:1px solid var(--line);border-radius:13px;background:#fff;box-shadow:0 1px 2px rgba(15,33,26,.03)}
        .atlas-ai-table{width:100%;min-width:560px;border-collapse:collapse;font-size:11.5px;line-height:1.45;color:var(--ink)}
        .atlas-ai-table th,.atlas-ai-table td{padding:9px 10px;text-align:start;vertical-align:top;border-bottom:1px solid var(--line);border-inline-end:1px solid var(--line);white-space:normal}
        .atlas-ai-table th{background:var(--surface-soft);font-size:10px;font-weight:850;color:var(--ink-soft);white-space:nowrap}
        .atlas-ai-table th:last-child,.atlas-ai-table td:last-child{border-inline-end:0}
        .atlas-ai-table tbody tr:last-child td{border-bottom:0}
        .atlas-ai-table-wrap:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
        [dir="rtl"] .atlas-ai-table{direction:rtl}
        @media(max-width:700px){.atlas-ai-table{min-width:520px;font-size:11px}.atlas-ai-table th,.atlas-ai-table td{padding:8px}}
      `}</style>
    </>
  );
}
