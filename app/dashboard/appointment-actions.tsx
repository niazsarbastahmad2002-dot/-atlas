"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  allowedAppointmentTransitions,
  canConfirmAppointmentAttendance,
  toBaghdadInputValue,
  type AppointmentMutationFailure,
  type AppointmentStatus,
} from "@/lib/appointments";
import type { UiLocale } from "@/lib/i18n/ui";
import { nextReceptionQuickAction } from "@/lib/reception-quick-action";
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
    if (reason === "too_early") return "هاتن تەنها لە ڕۆژی وادە یان دوای ئەوە پشتڕاست دەکرێتەوە؛ ئەنجامی سەردانیش نزیک کاتی وادە تۆمار بکە.";
    if (reason === "past_cancelled") return "مەوعیدی هەڵوەشێنراوی ڕابردوو ناگەڕێندرێتەوە؛ مەوعیدێکی نوێ دروست بکە.";
    if (reason === "stale") return "ئەم مەوعیدە لە شوێنێکی تر گۆڕدراوە. نوێترین دۆخ بار دەکرێتەوە.";
    if (reason === "invalid") return "ئەم گۆڕانکارییە بۆ ئەم مەوعیدە ڕێگەپێدراو نییە.";
    return "گۆڕانکارییەکە پاشەکەوت نەکرا. دووبارە هەوڵ بدە.";
  }
  if (locale === "bd") {
    if (reason === "busy") return "مەوعید هێشتا دهێتە نوێکرن. دووبارە هەول بدە.";
    if (reason === "too_early") return "هاتن تەنێ ل ڕۆژا وادەیێ یان پشتی وێ دهێتە پشتڕاستکرن؛ ئەنجامێ سەردانێ ژی نێزیکی دەمێ وادەیێ تۆمار بکە.";
    if (reason === "past_cancelled") return "مەوعیدا هەلوەشاندی یا دەربازبووی ناهێتە ڤەگەراندن؛ مەوعیدا نوو دروست بکە.";
    if (reason === "stale") return "ئەڤ مەوعیدە ل جهەکێ دی هاتیە گۆڕین. نووترین بار دهێتە بارکرن.";
    if (reason === "invalid") return "ئەڤ گۆڕین بۆ ڤی مەوعیدی بەردەست نینە.";
    return "گۆڕین نەهاتە پاراستن. دووبارە هەول بدە.";
  }
  if (locale === "ar") {
    if (reason === "busy") return "الموعد قيد التحديث. حاول مرة أخرى.";
    if (reason === "too_early") return "تأكيد الحضور يصير بيوم الموعد أو بعده؛ ونتيجة الزيارة تتسجل قرب وقت الموعد.";
    if (reason === "past_cancelled") return "لا يمكن استعادة موعد ملغي مضى وقته. أنشئ موعداً جديداً.";
    if (reason === "stale") return "تم تغيير هذا الموعد من مكان آخر. سيتم تحميل أحدث حالة.";
    if (reason === "invalid") return "هذا التغيير غير متاح لهذا الموعد.";
    return "لم يتم حفظ التغيير. حاول مرة أخرى.";
  }
  if (reason === "busy") return "This appointment is still updating. Try again.";
  if (reason === "too_early") return "Confirm attendance on or after the appointment day. Record visit outcomes near the appointment time.";
  if (reason === "past_cancelled") return "A past cancelled appointment cannot be restored. Create a new appointment instead.";
  if (reason === "stale") return "This appointment changed elsewhere. Loading the latest status.";
  if (reason === "invalid") return "That change is not available for this appointment.";
  return "The change was not saved. Try again.";
}

const workflowCopy: Record<UiLocale, {
  status: string;
  confirmArrival: string;
  finishVisit: string;
  updating: string;
  remove: string;
  removeQuestion: string;
  labels: Record<AppointmentStatus, string>;
}> = {
  en: {
    status: "Patient status",
    confirmArrival: "Confirm arrival", finishVisit: "Complete visit", updating: "Updating…",
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
    confirmArrival: "هاتن پشتڕاست بکە", finishVisit: "سەردان تەواو بکە", updating: "نوێ دەکرێتەوە…",
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
    confirmArrival: "هاتنێ پشتڕاست بکە", finishVisit: "سەردانێ تەمام بکە", updating: "دهێتە نووکرن…",
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
    confirmArrival: "تأكيد الحضور", finishVisit: "إنهاء الزيارة", updating: "جارٍ التحديث…",
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
  revision,
  appointmentAt,
  patientName,
  status,
  locale,
  reminderLanguage,
}: {
  clinicId: string;
  appointmentId: string;
  revision: number;
  appointmentAt: string;
  patientName: string;
  status: AppointmentStatus;
  locale: UiLocale;
  reminderLanguage: UiLocale;
}) {
  const router = useRouter();
  const [optimisticStatus, setOptimisticStatus] = useState(status);
  const [optimisticRevision, setOptimisticRevision] = useState(revision);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [, setClockTick] = useState(0);
  const workflow = workflowCopy[locale];
  const statusLabel = `${workflow.status}: ${patientName}`;

  useEffect(() => {
    const scheduledAt = new Date(appointmentAt).getTime();
    if (!Number.isFinite(scheduledAt)) return;

    const localDay = toBaghdadInputValue(new Date(appointmentAt)).slice(0, 10);
    const dayStart = Date.parse(`${localDay}T00:00:00+03:00`);
    const boundaries = [dayStart, scheduledAt - 5 * 60 * 1000, scheduledAt + 5 * 60 * 1000].sort((a, b) => a - b);
    let timer: number | null = null;
    const stop = () => {
      if (timer === null) return;
      window.clearTimeout(timer);
      timer = null;
    };
    const syncVisibility = () => {
      stop();
      if (document.hidden) return;
      const current = Date.now();
      setClockTick((tick) => tick + 1);
      const nextBoundary = boundaries.find((boundary) => boundary > current);
      if (nextBoundary === undefined) return;
      timer = window.setTimeout(syncVisibility, Math.min(nextBoundary - current + 50, 2_147_000_000));
    };

    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, [appointmentAt]);

  useEffect(() => {
    setOptimisticStatus(status);
    setOptimisticRevision(revision);
    setError(null);
  }, [revision, status]);

  const scheduledAt = new Date(appointmentAt).getTime();
  const tooEarlyForOutcome = Number.isFinite(scheduledAt) && scheduledAt > Date.now() + 5 * 60 * 1000;
  const tooEarlyForAttendance = !canConfirmAppointmentAttendance(appointmentAt);
  const tooLateToRestore = Number.isFinite(scheduledAt) && scheduledAt < Date.now() - 5 * 60 * 1000;

  function unavailableReason(nextStatus: AppointmentStatus) {
    if (nextStatus === "confirmed" && tooEarlyForAttendance) return "too_early" as const;
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
      const result = await updateAppointmentStatusInline(clinicId, appointmentId, previousStatus, optimisticRevision, nextStatus);
      if (!result.ok) {
        setOptimisticStatus(previousStatus);
        if (orderBadge) orderBadge.style.display = previousOrderDisplay;
        setError(actionFeedback(locale, result.reason));
        if (result.reason === "stale") router.refresh();
        return;
      }
      setOptimisticRevision((current) => current + 1);
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
      const result = await archiveAppointmentInline(clinicId, appointmentId, optimisticStatus, optimisticRevision);
      if (!result.ok) {
        if (card) {
          card.style.visibility = previousVisibility;
          card.style.pointerEvents = previousPointerEvents;
        }
        setError(actionFeedback(locale, result.reason));
        if (result.reason === "stale") router.refresh();
        return;
      }
      router.refresh();
    });
  }

  const transitions = allowedAppointmentTransitions(optimisticStatus).filter(shouldShowTransition);
  const options = [optimisticStatus, ...transitions.filter((item) => item !== optimisticStatus)];
  const quickNextStatus = nextReceptionQuickAction(optimisticStatus, !tooEarlyForAttendance, !tooEarlyForOutcome);
  const quickActionLabel = quickNextStatus === "confirmed" ? workflow.confirmArrival : workflow.finishVisit;

  return (
    <div className="row-actions polished-actions appointment-action-bar" role="group" aria-label={statusLabel} aria-busy={pending}>
      {quickNextStatus ? <button
        className={`appointment-quick-action is-${quickNextStatus}`}
        type="button"
        disabled={pending}
        onClick={(event) => changeStatus(quickNextStatus, event.currentTarget)}
        aria-label={`${quickActionLabel}: ${patientName}`}
      >{pending ? workflow.updating : quickActionLabel}</button> : null}
      <div className="appointment-status-control">
        <label className="sr-only" htmlFor={`appointment-status-${appointmentId}`}>{statusLabel}</label>
        <select
          id={`appointment-status-${appointmentId}`}
          className={`appointment-status-select is-${optimisticStatus}`}
          value={optimisticStatus}
          disabled={pending}
          onChange={(event) => changeStatus(event.currentTarget.value as AppointmentStatus, event.currentTarget)}
          aria-label={statusLabel}
        >
          {options.map((value) => <option key={value} value={value}>{workflow.labels[value]}</option>)}
        </select>
      </div>

      <PatientLinkButton key={`${appointmentId}:${revision}`} clinicId={clinicId} appointmentId={appointmentId} patientName={patientName} locale={locale} reminderLanguage={reminderLanguage} />

      <button
        className="appointment-remove-action"
        type="button"
        disabled={pending}
        aria-label={`${workflow.remove}: ${patientName}`}
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
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }
        .appointment-status-control { flex: 1 1 180px; min-width: 0; max-width: 340px; }
        .row-actions button.appointment-quick-action {
          flex: 1 1 160px;
          min-width: 160px;
          min-height: 46px;
          border: 1px solid #096649;
          border-radius: 12px;
          padding: 11px 18px;
          background: #087653;
          color: #fff;
          font: inherit;
          font-size: 13px;
          font-weight: 850;
          line-height: 1.25;
          text-align: center;
          cursor: pointer;
          touch-action: manipulation;
        }
        .row-actions button.appointment-quick-action.is-completed { border-color: #144e65; background: #185f7b; }
        .row-actions button.appointment-quick-action:hover:not(:disabled) { filter: brightness(1.08); }
        .row-actions button.appointment-quick-action:disabled { opacity: .65; cursor: wait; }
        .row-actions button.appointment-quick-action:focus-visible { outline: 3px solid #dc9b31; outline-offset: 3px; }
        .appointment-status-select {
          width: 100%;
          min-height: 46px;
          border-radius: 12px;
          padding-block: 10px;
          font-size: 12.5px;
          font-weight: 780;
          line-height: 1.25;
          box-shadow: none;
        }
        .appointment-status-select.is-pending { color: #6d5615; background: #fff7e5; border-color: #ead7a0; }
        .appointment-status-select.is-confirmed { color: #176f56; background: #eaf7f2; border-color: #b9ddcf; }
        .appointment-status-select.is-completed { color: #53655f; background: #f1f4f3; border-color: #d8e0dd; }
        .appointment-status-select.is-no_show { color: #8b3434; background: #fff0f0; border-color: #eccaca; }
        .appointment-status-select.is-cancelled { color: #705858; background: #f6f2f2; border-color: #dfd2d2; }
        .appointment-action-feedback { grid-column: 1 / -1; color: var(--danger); font-size: 10.5px; line-height: 1.4; }

        .row-actions button.appointment-remove-action {
          min-height: 44px;
          border: 1px solid #dfb7b7;
          border-radius: 10px;
          padding: 7px 12px;
          background: #fff3f3;
          color: #9b2424;
          font-size: 11px;
          font-weight: 820;
          line-height: 1;
          white-space: nowrap;
          cursor: pointer;
        }
        .row-actions button.appointment-remove-action:hover { background: #ffd0d0; border-color: #c95353; color: #8f1515; }

        @media (max-width: 720px) {
          .polished-appointment .appointment-details { grid-template-columns: 1fr 1fr; }
          .appointment-status-control { max-width: none; }
        }
        @media (max-width: 520px) {
          .polished-appointment .appointment-details { grid-template-columns: 1fr; }
          .row-actions button.appointment-quick-action { flex-basis: 100%; }
          .appointment-status-control { flex-basis: 100%; }
        }
      `}</style>
    </div>
  );
}
