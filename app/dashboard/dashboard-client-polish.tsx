"use client";

import { useEffect } from "react";
import { localizeDigits, toAsciiDigits } from "@/lib/i18n/format";
import type { UiLocale } from "@/lib/i18n/ui";

function groupPhone(value: string) {
  const ascii = toAsciiDigits(value).trim();
  const hasInternationalPrefix = ascii.startsWith("+") || ascii.startsWith("964") || ascii.startsWith("00964");
  let digits = ascii.replace(/\D/g, "");

  if (digits.startsWith("00964")) digits = digits.slice(2);
  if (hasInternationalPrefix && digits.startsWith("964")) {
    const local = digits.slice(3, 13);
    const groups = [local.slice(0, 3), local.slice(3, 6), local.slice(6, 10)].filter(Boolean);
    return `+964${groups.length ? ` ${groups.join(" ")}` : ""}`;
  }

  const local = digits.slice(0, 11);
  return [local.slice(0, 4), local.slice(4, 7), local.slice(7, 11)].filter(Boolean).join(" ");
}

function localizeVisibleText(value: string, locale: UiLocale) {
  if (locale === "en") return value;

  let text = value;
  if (locale === "ku") {
    text = text
      .replace(/\b(\d+)\s*min\b/gi, (_, value: string) => `${value} خولەک`)
      .replace(/\b(\d+)\s*hours?\b/gi, (_, value: string) => `${value} کاتژمێر`)
      .replace(/\b(\d+)\s*days?\b/gi, (_, value: string) => `${value} ڕۆژ`);
  } else {
    text = text
      .replace(/\b(\d+)\s*min\b/gi, (_, value: string) => `${value} دقيقة`)
      .replace(/\b(\d+)\s*hours?\b/gi, (_, value: string) => `${value} ساعة`)
      .replace(/\b(\d+)\s*days?\b/gi, (_, value: string) => `${value} يوم`);
  }
  return localizeDigits(text, locale);
}

export function DashboardClientPolish({ locale }: { locale: UiLocale }) {
  useEffect(() => {
    const preparedInputs = new WeakSet<HTMLInputElement>();
    let frame = 0;

    const preparePhoneInput = (input: HTMLInputElement) => {
      if (preparedInputs.has(input)) return;
      preparedInputs.add(input);
      input.removeAttribute("pattern");
      input.dir = "ltr";
      input.style.textAlign = locale === "en" ? "left" : "right";
      input.placeholder = localizeDigits("0750 000 0000", locale);

      const update = () => {
        const formatted = groupPhone(input.value);
        const display = localizeDigits(formatted, locale);
        if (input.value !== display) input.value = display;
        window.requestAnimationFrame(() => {
          try {
            input.setSelectionRange(display.length, display.length);
          } catch {}
        });
      };

      update();
      input.addEventListener("input", update);
    };

    const polish = () => {
      document.querySelectorAll<HTMLInputElement>('.app-shell input[type="tel"]').forEach(preparePhoneInput);
      if (locale === "en") return;

      const shell = document.querySelector(".app-shell");
      if (!shell) return;
      const walker = document.createTreeWalker(shell, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        const parent = node.parentElement;
        if (!parent || ["SCRIPT", "STYLE"].includes(parent.tagName)) continue;
        nodes.push(node);
      }

      for (const node of nodes) {
        const next = localizeVisibleText(node.data, locale);
        if (next !== node.data) node.data = next;
      }
    };

    const schedulePolish = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        polish();
      });
    };

    polish();
    const observer = new MutationObserver(schedulePolish);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [locale]);

  return (
    <style jsx global>{`
      .appointment-composer {
        position: static !important;
        top: auto !important;
      }
      .workspace-page {
        padding-bottom: calc(120px + env(safe-area-inset-bottom, 0px));
      }
      .appointment-composer,
      .appointment-form,
      .app-content {
        overflow: visible;
      }
    `}</style>
  );
}
