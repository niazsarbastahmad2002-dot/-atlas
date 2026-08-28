"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  allowedAppointmentTransitions,
  type AppointmentMutationFailure,
  type AppointmentStatus,
} from "@/lib/appointments";
import type { UiLocale } from "@/lib/i18n/ui";
import {
  archiveAppointmentInline,
  updateAppointmentStatusInline,
} from "./instant-actions";
import { PatientLinkButton } from "./patient-link-button";

function findAppointmentCard(target: EventTarget | null) {
  return target instanceof HTMLElement ? target.closest<HTMLElement>(".appointment-row") : null;
}

function paintOrderVisibility(card: HTMLElement | null, status: AppointmentStatus) {
  const badge = card?.querySelector<HTMLElement>(".appointment-order-badge");
  if (!badge) return;
  badge.style.display = status === "pending" || status === "confirmed" ? "" : "none";
}

function actionFeedback(locale: UiLocale, reason: AppointmentMutationFailure) {
  if (locale === "ku") {
    if (reason === "busy") return "مەوعیدەکە هێشتا نوێ دەکرێتەوە. دووبارە هەوڵ بدە.";
    if (reason === "too_early") return "هێشتا کاتی مەوعیدەکە نەهاتووە. دوای کاتی مەوعید دۆخی کۆتایی تۆمار بکە.";
    if (reason === "past_cancelled") return "مەوعیدی هەڵوەشێنراوی ڕابردوو ناگەڕێندرێتەوە؛ مەوعیدێکی نوێ دروست بکە.";
    if (reason === "invalid") return "ئەم گۆڕانکارییە بۆ ئەم مەوعیدە ڕێگەپێدراو نییە.";
    return "گۆڕانکارییەکە پاشەکەوت نەکرا. دووبارە هەوڵ بدە.";
  }
  if (locale === "bd") {
    if (reason === "busy") return "مەوعید هێشتا دهێتە نوێکرن. دووبارە هەول بدە.";
    if (reason === "too_early") return "هێشتا دەمێ مەوعیدی نەهاتییە. پشتی دەمێ مەوعیدی ئەنجامێ تۆمار بکە.";
    if (reason === "past_cancelled") return "مەوعیدا هەلوەشاندی یا دەربازبووی ناهێتە ڤەگەراندن؛ مەوعیدا نوو دروست بکە.";
    if (reason === "invalid") return "ئەڤ گۆڕین بۆ ڤی مەوعیدی بەردەست نینە.";
    return "گۆڕین نەهاتە پاراستن. دووبارە هەول بدە.";
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

const workflowCopy: Record<UiLocale, {
  status: string;
  remove: string;
  removeQuestion: string;
  labels: Record<AppointmentStatus, string>;
}> = {
  en: {
    status: "Patient status",
    remove: "Remove",
    removeQuestion: "Remove this appointment from the schedule? Atlas will keep its history.",
    labels: {
      pending: "Attendance not confirmed",
      confirmed: "Attendance confirmed",
      cancelled: "Appointment cancelled",
      completed: "Visit completed",
      no_show: "Did not attend",
    },
  },
  ku: {
    status: "دۆخی نەخۆش",
    remove: "لابردن",
    removeQuestion: "ئەم مەوعیدە لە خشتە لاببرێت؟ مێژووەکەی لە Atlas دەپارێزرێت.",
    labels: {
      pending: "هێشتا هاتن پشتڕاست نەکراوە",
      confirmed: "هاتن پشتڕاستکراوە",
      cancelled: "مەوعید هەڵوەشێنراوە",
      completed: "سەردان تەواوبوو",
      no_show: "بۆ مەوعید نەهات",
    },
  },
  bd: {
    status: "بارێ نەخۆشی",
    remove: "لابرن",
    removeQuestion: "ئەڤ مەوعید ژ خشتەیێ لاببەین؟ Atlas مێژوویا وێ دپارێزیت.",
    labels: {
      pending: "هێشتا هاتن نەهاتیە پشتڕاستکرن",
      confirmed: "هاتن پشتڕاستکریە",
      cancelled: "مەوعید هەلوەشیا",
      completed: "سەردان تەمام بوو",
      no_show: "بۆ مەوعیدی نەهات",
    },
  },
  ar: {
    status: "حالة المريض",
    remove: "إزالة",
    removeQuestion: "إزالة هذا الموعد من الجدول؟ سيحتفظ Atlas بسجله.",
    labels: {
      pending: "الحضور غير مؤكد بعد",
      confirmed: "الحضور مؤكد",
      cancelled: "الموعد ملغي",
      completed: "انتهت الزيارة",
      no_show: "لم يحضر",
    },
  },
};

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
  const workflow = workflowCopy[locale];

  useEffect(() => {
    setOptimisticStatus(status);
  }, [status]);

  const scheduledAt = new Date(appointmentAt).getTime();
  const tooEarlyForOutcome = Number.isFinite(scheduledAt) && scheduledAt > Date.now() + 5 * 60 * 1000;
  const tooLateToRestore = Number.isFinite(scheduledAt) && scheduledAt < Date.now() - 5 * 60 * 1000;

  function unavailableReason(nextStatus: AppointmentStatus) {
    if ((nextStatus === "completed" || nextStatus === "no_show") && tooEarlyForOutcome) return "too_early" as const;
    if (nextStatus === "pending" && optimisticStatus === "cancelled" && tooLateToRestore) return "past_cancelled" as const;
    return null;
  }

  function shouldShowTransition(nextStatus: AppointmentStatus) {
    if (unavailableReason(nextStatus)) return false;
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
    const orderBadge = card?.querySelector<HTMLElement>(".appointment-order-badge") ?? null;
    const previousOrderDisplay = orderBadge?.style.display ?? "";
    setError(null);
    setOptimisticStatus(nextStatus);
    paintOrderVisibility(card, nextStatus);

    startTransition(async () => {
      const result = await updateAppointmentStatusInline(clinicId, appointmentId, nextStatus);
      if (!result.ok) {
        setOptimisticStatus(previousStatus);
        if (orderBadge) orderBadge.style.display = previousOrderDisplay;
        setError(actionFeedback(locale, result.reason));
        return;
      }
      router.refresh();
    });
  }

  function remove(target: EventTarget | null) {
    if (pending || !window.confirm(workflow.removeQuestion)) return;
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
  const options = [optimisticStatus, ...transitions.filter((item) => item !== optimisticStatus)];

  return (
    <div className="row-actions polished-actions appointment-action-bar" aria-label={workflow.status} aria-busy={pending}>
      <div className="appointment-status-control">
        <label className="sr-only" htmlFor={`appointment-status-${appointmentId}`}>{workflow.status}</label>
        <select
          id={`appointment-status-${appointmentId}`}
          className={`appointment-status-select is-${optimisticStatus}`}
          value={optimisticStatus}
          disabled={pending}
          onChange={(event) => changeStatus(event.currentTarget.value as AppointmentStatus, event.currentTarget)}
          aria-label={workflow.status}
        >
          {options.map((value) => <option key={value} value={value}>{workflow.labels[value]}</option>)}
        </select>
      </div>

      <PatientLinkButton clinicId={clinicId} appointmentId={appointmentId} locale={locale} />

      <button
        className="appointment-remove-action"
        type="button"
        disabled={pending}
        onClick={(event) => remove(event.currentTarget)}
      >
        {workflow.remove}
      </button>

      {error ? <span className="appointment-action-feedback" role="alert">{error}</span> : null}

      <style jsx global>{`
        .appointment-badges > .status:not(.status-reminder) { display: none; }
        .polished-appointment .appointment-details { grid-template-columns: minmax(120px, .8fr) minmax(180px, 1.25fr); }
        .polished-appointment .appointment-details > div:nth-child(3) { display: none; }

        .appointment-action-bar {
          display: grid;
          grid-template-columns: minmax(220px, 300px) auto auto;
          align-items: center;
          gap: 8px;
        }
        .appointment-status-control { min-width: 0; }
        .appointment-status-select {
          min-height: 38px;
          height: 38px;
          border-radius: 10px;
          padding-block: 6px;
          font-size: 11.5px;
          font-weight: 780;
          line-height: 1.2;
          box-shadow: none;
        }
        .appointment-status-select.is-pending { color: #6d5615; background: #fff7e5; border-color: #ead7a0; }
        .appointment-status-select.is-confirmed { color: #176f56; background: #eaf7f2; border-color: #b9ddcf; }
        .appointment-status-select.is-completed { color: #53655f; background: #f1f4f3; border-color: #d8e0dd; }
        .appointment-status-select.is-no_show { color: #8b3434; background: #fff0f0; border-color: #eccaca; }
        .appointment-status-select.is-cancelled { color: #705858; background: #f6f2f2; border-color: #dfd2d2; }
        .appointment-action-feedback { grid-column: 1 / -1; color: var(--danger); font-size: 10.5px; line-height: 1.4; }

        .row-actions button.appointment-remove-action {
          min-height: 38px;
          border: 1px solid #d76d6d;
          border-radius: 10px;
          padding: 7px 12px;
          background: #ffe1e1;
          color: #a61b1b;
          font-size: 11px;
          font-weight: 820;
          line-height: 1;
          white-space: nowrap;
          cursor: pointer;
        }
        .row-actions button.appointment-remove-action:hover { background: #ffd0d0; border-color: #c95353; color: #8f1515; }

        @media (max-width: 720px) {
          .polished-appointment .appointment-details { grid-template-columns: 1fr 1fr; }
          .appointment-action-bar { grid-template-columns: minmax(0, 1fr) auto auto; }
          .appointment-status-select { width: 100%; }
        }
        @media (max-width: 520px) {
          .polished-appointment .appointment-details { grid-template-columns: 1fr; }
          .appointment-action-bar { grid-template-columns: minmax(0, 1fr) auto; }
          .appointment-status-control { grid-column: 1 / -1; }
          .row-actions button.appointment-remove-action { justify-self: end; }
        }
      `}</style>
    </div>
  );
}
