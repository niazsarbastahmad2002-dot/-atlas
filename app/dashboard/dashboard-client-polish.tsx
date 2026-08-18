"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { formatTimeValue, localizeDigits, toAsciiDigits } from "@/lib/i18n/format";
import type { UiLocale } from "@/lib/i18n/ui";
import { createAppointmentInline } from "./instant-actions";

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
    "That setting could not be saved. Refresh and try again.": "ڕێکخستنەکە نەگۆڕدرا. دووبارە هەوڵ بدە.",
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

const fastSaveCopy = {
  en: {
    saving: "Adding appointment…",
    saved: "Appointment added",
    failed: "Could not add appointment. Check the details and try again.",
    slotTaken: "That time was just taken. Choose another time.",
  },
  ku: {
    saving: "وادە دادەنرێت…",
    saved: "وادە دانرا",
    failed: "وادە دانەنرا. زانیارییەکان بپشکنە.",
    slotTaken: "ئەم کاتە گیرا. کاتێکی تر هەڵبژێرە.",
  },
  ar: {
    saving: "جارٍ إضافة الموعد…",
    saved: "تمت إضافة الموعد",
    failed: "تعذرت إضافة الموعد. تحقق من البيانات وحاول مرة أخرى.",
    slotTaken: "تم حجز هذا الوقت للتو. اختر وقتاً آخر.",
  },
} as const;

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
  // Email addresses are literal account identifiers, not translated UI. Their
  // ASCII spelling and digits must remain exactly as entered in every locale.
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return value;

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

function showFastSaveToast(locale: UiLocale, patientName: string, appointmentAt: string) {
  document.querySelectorAll(".atlas-fast-save-toast").forEach((element) => element.remove());

  const toast = document.createElement("div");
  toast.className = "atlas-fast-save-toast";
  toast.dir = locale === "en" ? "ltr" : "rtl";

  const main = document.createElement("strong");
  main.textContent = fastSaveCopy[locale].saving;
  const detail = document.createElement("span");
  const time = appointmentAt.includes("T") ? appointmentAt.split("T")[1] : "";
  detail.textContent = [patientName, time ? formatTimeValue(time, locale) : ""].filter(Boolean).join(" · ");
  toast.append(main, detail);
  document.body.append(toast);

  return {
    success() {
      toast.classList.add("is-success");
      main.textContent = `✓ ${fastSaveCopy[locale].saved}`;
      window.setTimeout(() => toast.remove(), 700);
    },
    fail(slotTaken = false) {
      toast.classList.add("is-error");
      main.textContent = slotTaken ? fastSaveCopy[locale].slotTaken : fastSaveCopy[locale].failed;
      window.setTimeout(() => toast.remove(), 2600);
    },
  };
}

export function DashboardClientPolish({ locale }: { locale: UiLocale }) {
  const router = useRouter();

  useEffect(() => {
    const preparedInputs = new WeakSet<HTMLInputElement>();
    const preparedForms = new WeakSet<HTMLFormElement>();
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

    const prepareAppointmentForm = (form: HTMLFormElement) => {
      if (preparedForms.has(form)) return;
      preparedForms.add(form);

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        if (form.dataset.fastSaving === "true") return;
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        const formData = new FormData(form);
        const appointmentAt = String(formData.get("appointment_at") ?? "");
        const patientName = String(formData.get("patient_name") ?? "").trim();
        if (!appointmentAt) {
          showFastSaveToast(locale, patientName, "").fail(false);
          return;
        }

        form.dataset.fastSaving = "true";
        const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
        const originalLabel = button?.textContent ?? "";
        if (button) {
          button.disabled = true;
          button.textContent = fastSaveCopy[locale].saving;
        }
        const toast = showFastSaveToast(locale, patientName, appointmentAt);

        try {
          const result = await createAppointmentInline(formData);
          if (!result.ok) {
            toast.fail(result.reason === "slot_taken");
            return;
          }

          const nameInput = form.querySelector<HTMLInputElement>('#patient_name');
          const phoneInput = form.querySelector<HTMLInputElement>('#patient_phone');
          const consentInput = form.querySelector<HTMLInputElement>('#reminder_consent');
          const idempotencyInput = form.querySelector<HTMLInputElement>('input[name="idempotency_key"]');
          if (nameInput) nameInput.value = "";
          if (phoneInput) phoneInput.value = "";
          if (consentInput) consentInput.checked = false;
          if (idempotencyInput && typeof crypto.randomUUID === "function") idempotencyInput.value = crypto.randomUUID();

          toast.success();
          if (button) button.textContent = `✓ ${fastSaveCopy[locale].saved}`;
          router.refresh();
        } catch {
          toast.fail(false);
        } finally {
          form.dataset.fastSaving = "false";
          window.setTimeout(() => {
            if (button && button.isConnected) {
              button.disabled = false;
              button.textContent = originalLabel;
            }
          }, 120);
        }
      }, true);
    };

    const polish = () => {
      document.querySelectorAll<HTMLInputElement>('.app-shell input[type="tel"]').forEach(preparePhoneInput);
      document.querySelectorAll<HTMLFormElement>(".app-shell form.appointment-form").forEach(prepareAppointmentForm);
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
  }, [locale, router]);

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
      .atlas-fast-save-toast {
        position: fixed;
        z-index: 250;
        inset-inline-end: max(18px, env(safe-area-inset-right, 0px));
        bottom: max(22px, calc(env(safe-area-inset-bottom, 0px) + 18px));
        display: grid;
        gap: 3px;
        width: min(320px, calc(100vw - 36px));
        border: 1px solid #cbdad1;
        border-radius: 14px;
        padding: 12px 14px;
        background: #fff;
        color: var(--ink);
        box-shadow: 0 18px 48px rgba(20,36,28,.16);
        animation: atlas-toast-in .16s ease-out both;
      }
      .atlas-fast-save-toast strong { font-size: 13px; }
      .atlas-fast-save-toast span { color: var(--muted); font-size: 11px; }
      .atlas-fast-save-toast.is-success { border-color: #b8ddc7; background: #f2fbf5; }
      .atlas-fast-save-toast.is-success strong { color: var(--success); }
      .atlas-fast-save-toast.is-error { border-color: #efc3c3; background: #fff7f7; }
      .atlas-fast-save-toast.is-error strong { color: var(--danger); }
      @keyframes atlas-toast-in {
        from { opacity: 0; transform: translateY(8px) scale(.985); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @media (max-width: 720px) {
        .atlas-fast-save-toast {
          inset-inline: 14px;
          width: auto;
          bottom: calc(84px + env(safe-area-inset-bottom, 0px));
        }
      }
    `}</style>
  );
}
