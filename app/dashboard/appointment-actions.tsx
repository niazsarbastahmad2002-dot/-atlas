"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  allowedAppointmentTransitions,
  type AppointmentStatus,
} from "@/lib/appointments";
import { uiText, type UiLocale } from "@/lib/i18n/ui";
import {
  archiveAppointmentInline,
  updateAppointmentStatusInline,
} from "./instant-actions";
import { PatientLinkButton } from "./patient-link-button";

function findAppointmentCard(target: EventTarget | null) {
  return target instanceof HTMLElement ? target.closest<HTMLElement>(".appointment-row") : null;
}

function paintStatus(card: HTMLElement | null, status: AppointmentStatus, label: string) {
  const badge = card?.querySelector<HTMLElement>(".appointment-badges .status:first-child");
  if (!badge) return;
  badge.className = `status status-${status}`;
  badge.textContent = label;
}

function inlineError(locale: UiLocale, reason: string) {
  if (locale === "ku") {
    return reason === "busy"
      ? "وادەکە هێشتا نوێ دەکرێتەوە. دووبارە هەوڵ بدە."
      : "گۆڕانکارییەکە پاشەکەوت نەکرا. دووبارە هەوڵ بدە.";
  }
  if (locale === "ar") {
    return reason === "busy"
      ? "الموعد قيد التحديث. حاول مرة أخرى."
      : "لم يتم حفظ التغيير. حاول مرة أخرى.";
  }
  return reason === "busy"
    ? "This appointment is still updating. Try again."
    : "The change was not saved. Try again.";
}

export function AppointmentActions({
  clinicId,
  appointmentId,
  status,
  locale,
}: {
  clinicId: string;
  appointmentId: string;
  status: AppointmentStatus;
  locale: UiLocale;
}) {
  const router = useRouter();
  const [optimisticStatus, setOptimisticStatus] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const t = uiText(locale);

  const actionLabels: Record<AppointmentStatus, string> = {
    pending: t.reopen,
    confirmed: t.confirm,
    cancelled: t.cancel,
    completed: t.complete,
    no_show: t.noShow,
  };
  const statusLabels: Record<AppointmentStatus, string> = {
    pending: t.pending,
    confirmed: t.confirmed,
    cancelled: t.cancelled,
    completed: t.completed,
    no_show: t.noShow,
  };
  const archiveQuestion = locale === "ku"
    ? "ئەم وادەیە ئەرشیف بکرێت؟ مێژووەکەی دەپارێزرێت."
    : locale === "ar"
      ? "أرشفة هذا الموعد؟ سيتم الاحتفاظ بسجله."
      : "Archive this appointment? Its history will be retained.";

  function changeStatus(nextStatus: AppointmentStatus, target: EventTarget | null) {
    if (pending || nextStatus === optimisticStatus) return;

    const previousStatus = optimisticStatus;
    const card = findAppointmentCard(target);
    setError(null);
    setOptimisticStatus(nextStatus);
    paintStatus(card, nextStatus, statusLabels[nextStatus]);

    startTransition(async () => {
      const result = await updateAppointmentStatusInline(clinicId, appointmentId, nextStatus);
      if (!result.ok) {
        setOptimisticStatus(previousStatus);
        paintStatus(card, previousStatus, statusLabels[previousStatus]);
        setError(inlineError(locale, result.reason));
        return;
      }

      // Refresh server-derived totals and reminder state without navigation or scroll reset.
      router.refresh();
    });
  }

  function archive(target: EventTarget | null) {
    if (pending || !window.confirm(archiveQuestion)) return;
    const card = findAppointmentCard(target);
    const previousVisibility = card?.style.visibility ?? "";
    const previousPointerEvents = card?.style.pointerEvents ?? "";
    if (card) {
      card.style.visibility = "hidden";
      card.style.pointerEvents = "none";
    }
    setError(null);

    startTransition(async () => {
      const result = await archiveAppointmentInline(clinicId, appointmentId);
      if (!result.ok) {
        if (card) {
          card.style.visibility = previousVisibility;
          card.style.pointerEvents = previousPointerEvents;
        }
        setError(inlineError(locale, result.reason));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="row-actions polished-actions" aria-label="Appointment actions" aria-busy={pending}>
      {allowedAppointmentTransitions(optimisticStatus).map((nextStatus) => (
        <button
          type="button"
          disabled={pending}
          key={nextStatus}
          onClick={(event) => changeStatus(nextStatus, event.currentTarget)}
        >
          {actionLabels[nextStatus]}
        </button>
      ))}
      <PatientLinkButton clinicId={clinicId} appointmentId={appointmentId} locale={locale} />
      <button
        className="archive-action"
        type="button"
        disabled={pending}
        onClick={(event) => archive(event.currentTarget)}
      >
        {t.archive}
      </button>
      {error ? <span className="inline-action-error" role="alert">{error}</span> : null}
    </div>
  );
}
