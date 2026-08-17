"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  allowedAppointmentTransitions,
  type AppointmentMutationFailure,
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

function actionFeedback(locale: UiLocale, reason: AppointmentMutationFailure) {
  if (locale === "ku") {
    if (reason === "busy") return "وادەکە هێشتا نوێ دەکرێتەوە. دووبارە هەوڵ بدە.";
    if (reason === "too_early") return "هێشتا کاتی وادەکە نەهاتووە. دوای کاتی وادە دۆخی کۆتایی تۆمار بکە.";
    if (reason === "past_cancelled") return "وادەی هەڵوەشێنراوی ڕابردوو ناگەڕێندرێتەوە؛ وادەیەکی نوێ دروست بکە.";
    if (reason === "invalid") return "ئەم گۆڕانکارییە بۆ ئەم وادەیە ڕێگەپێدراو نییە.";
    return "گۆڕانکارییەکە پاشەکەوت نەکرا. دووبارە هەوڵ بدە.";
  }
  if (locale === "ar") {
    if (reason === "busy") return "الموعد قيد التحديث. حاول مرة أخرى.";
    if (reason === "too_early") return "لم يحن وقت الموعد بعد. سجّل النتيجة بعد وقت الموعد.";
    if (reason === "past_cancelled") return "لا يمكن استعادة موعد ملغي مضى وقته. أنشئ موعداً جديداً.";
    if (reason === "invalid") return "هذا التغيير غير متاح لهذا الموعد.";
    return "لم يتم حفظ التغيير. حاول مرة أخرى.";
  }
  if (reason === "busy") return "This appointment is still updating. Try again.";
  if (reason === "too_early") return "It is too early to record the appointment outcome. Try again after the appointment time.";
  if (reason === "past_cancelled") return "A past cancelled appointment cannot be restored. Create a new appointment instead.";
  if (reason === "invalid") return "That change is not available for this appointment.";
  return "The change was not saved. Try again.";
}

const correctionCopy = {
  en: {
    restore: "Restore",
    backToPending: "Back to pending",
    undoCompleted: "Undo completed",
    undoNoShow: "Undo no-show",
  },
  ku: {
    restore: "گەڕاندنەوە",
    backToPending: "بگەڕێنەوە بۆ چاوەڕوان",
    undoCompleted: "کۆتایی هەڵبوەشێنەوە",
    undoNoShow: "نەهاتن هەڵبوەشێنەوە",
  },
  ar: {
    restore: "استعادة",
    backToPending: "إعادة إلى قيد الانتظار",
    undoCompleted: "تراجع عن مكتمل",
    undoNoShow: "تراجع عن عدم الحضور",
  },
} as const;

export function AppointmentActions({
  clinicId,
  appointmentId,
  appointmentAt,
  status,
  locale,
}: {
  clinicId: string;
  appointmentId: string;
  appointmentAt: string;
  status: AppointmentStatus;
  locale: UiLocale;
}) {
  const router = useRouter();
  const [optimisticStatus, setOptimisticStatus] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const t = uiText(locale);

  useEffect(() => {
    setOptimisticStatus(status);
  }, [status]);

  const statusLabels: Record<AppointmentStatus, string> = {
    pending: t.pending,
    confirmed: t.confirmed,
    cancelled: t.cancelled,
    completed: t.completed,
    no_show: t.noShow,
  };
  const removeLabel = locale === "ku" ? "لابردن" : locale === "ar" ? "إزالة" : "Remove";
  const removeQuestion = locale === "ku"
    ? "ئەم وادەیە لە خشتە لاببرێت؟ مێژووەکەی لە Atlas دەپارێزرێت."
    : locale === "ar"
      ? "إزالة هذا الموعد من الجدول؟ سيحتفظ Atlas بسجله."
      : "Remove this appointment from the schedule? Atlas will keep its history.";
  const scheduledAt = new Date(appointmentAt).getTime();
  const tooEarlyForOutcome = Number.isFinite(scheduledAt) && scheduledAt > Date.now() + 5 * 60 * 1000;
  const tooLateToRestore = Number.isFinite(scheduledAt) && scheduledAt < Date.now() - 5 * 60 * 1000;
  const corrections = correctionCopy[locale];

  function unavailableReason(nextStatus: AppointmentStatus) {
    if ((nextStatus === "completed" || nextStatus === "no_show") && tooEarlyForOutcome) return "too_early" as const;
    if (nextStatus === "pending" && optimisticStatus === "cancelled" && tooLateToRestore) return "past_cancelled" as const;
    return null;
  }

  function transitionLabel(nextStatus: AppointmentStatus) {
    if (optimisticStatus === "pending" && nextStatus === "confirmed") return t.confirm;
    if (nextStatus === "cancelled") return t.cancel;
    if (nextStatus === "completed") return t.complete;
    if (nextStatus === "no_show") return t.noShow;
    if (optimisticStatus === "cancelled" && nextStatus === "pending") return corrections.restore;
    if (optimisticStatus === "confirmed" && nextStatus === "pending") return corrections.backToPending;
    if (optimisticStatus === "completed" && nextStatus === "confirmed") return corrections.undoCompleted;
    if (optimisticStatus === "no_show" && nextStatus === "confirmed") return corrections.undoNoShow;
    return statusLabels[nextStatus];
  }

  function shouldShowTransition(nextStatus: AppointmentStatus) {
    if (unavailableReason(nextStatus)) return false;
    // Once the appointment time has arrived, reception only needs to record
    // the outcome; "Back to pending" is no longer useful on the main row.
    if (optimisticStatus === "confirmed" && nextStatus === "pending" && !tooEarlyForOutcome) return false;
    return true;
  }

  function changeStatus(nextStatus: AppointmentStatus, target: EventTarget | null) {
    if (pending || nextStatus === optimisticStatus) return;
    const blocked = unavailableReason(nextStatus);
    if (blocked) {
      setError(actionFeedback(locale, blocked));
      return;
    }

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
        setError(actionFeedback(locale, result.reason));
        return;
      }

      router.refresh();
    });
  }

  function remove(target: EventTarget | null) {
    if (pending || !window.confirm(removeQuestion)) return;
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
        setError(actionFeedback(locale, result.reason));
        return;
      }
      router.refresh();
    });
  }

  const transitions = allowedAppointmentTransitions(optimisticStatus).filter(shouldShowTransition);

  return (
    <div className="row-actions polished-actions" aria-label="Appointment actions" aria-busy={pending}>
      {transitions.map((nextStatus) => (
        <button
          type="button"
          disabled={pending}
          key={nextStatus}
          onClick={(event) => changeStatus(nextStatus, event.currentTarget)}
        >
          {transitionLabel(nextStatus)}
        </button>
      ))}
      <PatientLinkButton clinicId={clinicId} appointmentId={appointmentId} locale={locale} />
      <button
        className="archive-action"
        style={{ marginInlineStart: "auto", color: "var(--danger)", background: "transparent" }}
        type="button"
        disabled={pending}
        onClick={(event) => remove(event.currentTarget)}
      >
        {removeLabel}
      </button>
      {error ? (
        <span className="appointment-action-feedback" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
