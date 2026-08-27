"use client";

import { useEffect } from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import { AtlasAiClient as AtlasAiClientV5 } from "./atlas-ai-client-v5";

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

function askThroughComposer(root: HTMLElement, question: string) {
  const textarea = root.querySelector<HTMLTextAreaElement>("textarea");
  if (!textarea) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  setter?.call(textarea, question);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.dispatchEvent(new Event("change", { bubbles: true }));
  window.setTimeout(() => textarea.closest("form")?.requestSubmit(), 0);
}

function polishSorani(root: HTMLElement) {
  const privacy = root.querySelector<HTMLElement>(".atlas-ai-privacy");
  if (privacy) privacy.textContent = "Atlas AI بۆ وەڵامدانەوە لە زانیارییە ڕێگەپێدراوەکانی کلینیک بەکاردەهێنێت. وردەکاری مەوعیدەکان لە ناو Atlas دەپشکنرێت. تکایە زانیاری پزیشکی وەک دەستنیشانکردنی نەخۆشی یان تێبینی پزیشکی لێرە مەنووسە.";

  const empty = root.querySelector<HTMLElement>(".atlas-ai-empty");
  const presets = empty?.querySelector<HTMLElement>(".atlas-ai-presets");
  if (!empty || !presets || presets.dataset.atlasSoraniV6 === "1") return;
  presets.dataset.atlasSoraniV6 = "1";

  const label = Array.from(empty.children).find((node) => node instanceof HTMLSpanElement) as HTMLSpanElement | undefined;
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
    if (props.locale !== "ku") return;
    const root = document.querySelector<HTMLElement>(".atlas-ai-card");
    if (!root) return;
    const run = () => polishSorani(root);
    run();
    const observer = new MutationObserver(run);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [props.locale]);

  return (
    <>
      <AtlasAiClientV5 {...props} />
      <style>{`
        .atlas-ai-presets{max-width:920px;margin-inline:auto}
        .atlas-ai-presets button{white-space:normal;line-height:1.35;text-wrap:balance}
        @media(min-width:760px){.atlas-ai-presets{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}.atlas-ai-presets button{max-width:360px}}
      `}</style>
    </>
  );
}
