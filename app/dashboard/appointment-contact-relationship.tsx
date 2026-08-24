"use client";

import { useEffect } from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import { getAppointmentContactRelationshipInline } from "./instant-actions";

const copy = {
  en: {
    label: "Whose phone is this?",
    patient: "Patient",
    guardian: "Parent / guardian",
    caregiver: "Relative / caregiver",
    consent: "This phone’s owner agreed to WhatsApp reminders",
  },
  ku: {
    label: "ئەم ژمارەیە هی کێیە؟",
    patient: "نەخۆش",
    guardian: "دایک، باوک / سەرپەرشت",
    caregiver: "خزم / چاودێر",
    consent: "خاوەنی ئەم ژمارەیە ڕازییە بیرخستنەوەی واتسئاپ وەربگرێت",
  },
  bd: {
    label: "ئەڤ ژمارە یا کێیە؟",
    patient: "نەخۆش",
    guardian: "دایک، باب / سەرپەرشت",
    caregiver: "خزم / چاڤدێر",
    consent: "خودانێ ڤێ ژمارەیێ ڕازییە بیرخستنەوەیا واتسئاپێ وەربگریت",
  },
  ar: {
    label: "رقم من هذا؟",
    patient: "المريض",
    guardian: "الأب / الأم / ولي الأمر",
    caregiver: "قريب / مقدم رعاية",
    consent: "صاحب هذا الرقم وافق على استلام تذكيرات واتساب",
  },
} as const;

type Relationship = "patient" | "parent_guardian" | "relative_caregiver";

function createRelationshipField(locale: UiLocale, id: string, initial: Relationship = "patient") {
  const t = copy[locale];
  const label = document.createElement("label");
  label.htmlFor = id;
  label.dataset.atlasContactRelationship = "label";
  label.textContent = t.label;

  const select = document.createElement("select");
  select.id = id;
  select.name = "contact_relationship";
  select.dataset.atlasContactRelationship = "select";

  const options: Array<[Relationship, string]> = [
    ["patient", t.patient],
    ["parent_guardian", t.guardian],
    ["relative_caregiver", t.caregiver],
  ];
  for (const [value, text] of options) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    option.selected = value === initial;
    select.append(option);
  }

  return { label, select };
}

function replaceConsentCopy(form: HTMLFormElement, locale: UiLocale) {
  const checkbox = form.querySelector<HTMLInputElement>('input[name="reminder_consent"]');
  const text = checkbox?.closest("label")?.querySelector("span");
  if (text) text.textContent = copy[locale].consent;
}

function appointmentIdFromEditor(form: HTMLFormElement) {
  const input = form.querySelector<HTMLInputElement>('input[name="patient_name"]');
  const prefix = "edit-patient-";
  return input?.id.startsWith(prefix) ? input.id.slice(prefix.length) : null;
}

export function AppointmentContactRelationshipEnhancer({ locale }: { locale: UiLocale }) {
  useEffect(() => {
    let disposed = false;
    const decorated = new WeakSet<HTMLFormElement>();

    const decorateCreate = (form: HTMLFormElement) => {
      if (decorated.has(form)) return;
      decorated.add(form);
      if (!form.querySelector('select[name="contact_relationship"]')) {
        const phone = form.querySelector<HTMLInputElement>('input[name="patient_phone"]');
        const help = phone?.nextElementSibling?.classList.contains("field-help") ? phone.nextElementSibling : null;
        if (phone) {
          const field = createRelationshipField(locale, "contact_relationship");
          (help ?? phone).after(field.label, field.select);
        }
      }
      replaceConsentCopy(form, locale);
    };

    const decorateEditor = async (form: HTMLFormElement) => {
      if (decorated.has(form)) return;
      decorated.add(form);
      const appointmentId = appointmentIdFromEditor(form);
      let initial: Relationship = "patient";
      if (appointmentId) {
        try {
          const value = await getAppointmentContactRelationshipInline(appointmentId);
          if (value) initial = value;
        } catch {}
      }
      if (disposed || !form.isConnected || form.querySelector('select[name="contact_relationship"]')) return;
      const phone = form.querySelector<HTMLInputElement>('input[name="patient_phone"]');
      if (phone) {
        const field = createRelationshipField(locale, `edit-contact-${appointmentId ?? Math.random().toString(36).slice(2)}`, initial);
        phone.after(field.label, field.select);
      }
      replaceConsentCopy(form, locale);
    };

    const scan = () => {
      document.querySelectorAll<HTMLFormElement>(".app-shell form.appointment-form").forEach(decorateCreate);
      document.querySelectorAll<HTMLFormElement>(".app-shell form.appointment-edit-form").forEach((form) => { void decorateEditor(form); });
    };

    const onSubmit = (event: Event) => {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (!form?.matches(".appointment-form")) return;
      window.setTimeout(() => {
        if (!form.isConnected) return;
        const name = form.querySelector<HTMLInputElement>('input[name="patient_name"]');
        const phone = form.querySelector<HTMLInputElement>('input[name="patient_phone"]');
        const select = form.querySelector<HTMLSelectElement>('select[name="contact_relationship"]');
        if (select && !name?.value && !phone?.value) select.value = "patient";
      }, 700);
    };

    scan();
    document.addEventListener("submit", onSubmit, true);
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      disposed = true;
      observer.disconnect();
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [locale]);

  return null;
}
