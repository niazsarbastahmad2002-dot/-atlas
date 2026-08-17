"use client";

import { useEffect } from "react";
import { localizeDigits, toAsciiDigits } from "@/lib/i18n/format";
import type { UiLocale } from "@/lib/i18n/ui";

const exactCopy: Record<Exclude<UiLocale, "en">, Record<string, string>> = {
  ku: {
    "Lead time": "کاتی پێش وادە",
    "Messaging approved": "پەیام پەسەندکراوە",
    "Provider approval pending": "چاوەڕێی پەسەندکردنی دابینکەر",
    "Owner access": "تەنها خاوەن کلینیک",
    "The clinic settings could not load.": "ڕێکخستنەکانی کلینیک بار نەبوون.",
    "Only the clinic owner or a manager can change clinic settings.": "تەنها خاوەن کلینیک یان بەڕێوەبەر دەتوانێت ڕێکخستنەکان بگۆڕێت.",
    "Choose a supported interface language.": "زمانێکی بەردەست هەڵبژێرە.",
    "Check the clinic name and try again.": "ناوی کلینیک بپشکنە و دووبارە هەوڵ بدە.",
    "Choose a valid appointment interval.": "ماوەیەکی دروست بۆ نێوان وادەکان هەڵبژێرە.",
    "Check the doctor details and try again.": "زانیاری پزیشک بپشکنە و دووبارە هەوڵ بدە.",
    "Check the reminder settings and try again.": "ڕێکخستنی بیرخستنەوە بپشکنە و دووبارە هەوڵ بدە.",
    "That setting could not be saved. Refresh and try again.": "ڕێکخستنەکە پاشەکەوت نەبوو. دووبارە هەوڵ بدە.",
    "Interface language updated.": "زمانی Atlas گۆڕدرا.",
    "Clinic details updated.": "زانیاری کلینیک نوێکرایەوە.",
    "Appointment interval updated.": "ماوەی نێوان وادەکان نوێکرایەوە.",
    "Doctor settings updated.": "ڕێکخستنی پزیشک نوێکرایەوە.",
    "Doctor archived. Existing appointment history is preserved.": "پزیشک ئەرشیف کرا؛ مێژووی وادەکان پارێزراوە.",
    "Doctor restored.": "پزیشک گەڕێندرایەوە.",
    "Reminder settings updated.": "ڕێکخستنی بیرخستنەوە نوێکرایەوە.",
  },
  ar: {
    "Lead time": "وقت الإرسال المسبق",
    "Messaging approved": "تم اعتماد الرسائل",
    "Provider approval pending": "بانتظار اعتماد المزود",
    "Owner access": "للمالك فقط",
    "The clinic settings could not load.": "تعذر تحميل إعدادات العيادة.",
    "Only the clinic owner or a manager can change clinic settings.": "يمكن لمالك العيادة أو المدير فقط تغيير الإعدادات.",
    "Choose a supported interface language.": "اختر لغة واجهة مدعومة.",
    "Check the clinic name and try again.": "تحقق من اسم العيادة وحاول مرة أخرى.",
    "Choose a valid appointment interval.": "اختر فاصلاً صحيحاً بين المواعيد.",
    "Check the doctor details and try again.": "تحقق من بيانات الطبيب وحاول مرة أخرى.",
    "Check the reminder settings and try again.": "تحقق من إعدادات التذكير وحاول مرة أخرى.",
    "That setting could not be saved. Refresh and try again.": "تعذر حفظ الإعداد. حاول مرة أخرى.",
    "Interface language updated.": "تم تحديث لغة Atlas.",
    "Clinic details updated.": "تم تحديث بيانات العيادة.",
    "Appointment interval updated.": "تم تحديث فاصل المواعيد.",
    "Doctor settings updated.": "تم تحديث إعدادات الطبيب.",
    "Doctor archived. Existing appointment history is preserved.": "تمت أرشفة الطبيب مع الاحتفاظ بسجل المواعيد.",
    "Doctor restored.": "تمت استعادة الطبيب.",
    "Reminder settings updated.": "تم تحديث إعدادات التذكير.",
  },
};

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

  const trimmed = value.trim();
  const exact = exactCopy[locale][trimmed];
  if (exact) {
    const leading = value.slice(0, value.indexOf(trimmed));
    const trailing = value.slice(value.indexOf(trimmed) + trimmed.length);
    return `${leading}${exact}${trailing}`;
  }

  let text = value;
  if (locale === "ku") {
    text = text
      .replace(/\b(\d+)\s*min\b/gi, (_, number: string) => `${number} خولەک`)
      .replace(/\b(\d+)\s*hours?\b/gi, (_, number: string) => `${number} کاتژمێر`)
      .replace(/\b(\d+)\s*days?\b/gi, (_, number: string) => `${number} ڕۆژ`)
      .replace(/\bTemplate:\s*/g, "قاڵب: ")
      .replace(/\blimit\s+/gi, "سنوور ")
      .replace(/\/day\b/gi, "/ڕۆژ");
  } else {
    text = text
      .replace(/\b(\d+)\s*min\b/gi, (_, number: string) => `${number} دقيقة`)
      .replace(/\b(\d+)\s*hours?\b/gi, (_, number: string) => `${number} ساعة`)
      .replace(/\b(\d+)\s*days?\b/gi, (_, number: string) => `${number} يوم`)
      .replace(/\bTemplate:\s*/g, "القالب: ")
      .replace(/\blimit\s+/gi, "الحد ")
      .replace(/\/day\b/gi, "/يوم");
  }
  return localizeDigits(text, locale);
}

export function DashboardClientPolish({ locale }: { locale: UiLocale }) {
  useEffect(() => {
    const preparedInputs = new WeakSet<HTMLInputElement>();
    const preparedSelects = new WeakSet<HTMLSelectElement>();
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

    const prepareInstantSelect = (select: HTMLSelectElement) => {
      if (preparedSelects.has(select)) return;
      preparedSelects.add(select);

      if (select.id === "locale") {
        select.addEventListener("change", () => {
          const value = select.value as UiLocale;
          document.documentElement.lang = value === "ku" ? "ckb" : value;
          document.documentElement.dir = value === "en" ? "ltr" : "rtl";
          select.form?.requestSubmit();
        });
      }

      if (select.id === "appointment_interval_minutes") {
        select.addEventListener("change", () => select.form?.requestSubmit());
      }
    };

    const polish = () => {
      document.querySelectorAll<HTMLInputElement>('.app-shell input[type="tel"]').forEach(preparePhoneInput);
      document.querySelectorAll<HTMLSelectElement>(".app-shell select#locale, .app-shell select#appointment_interval_minutes").forEach(prepareInstantSelect);
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
