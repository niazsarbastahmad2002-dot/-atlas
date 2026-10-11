"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UiLocale } from "@/lib/i18n/ui";
import { updateAppointmentStatusInline } from "./instant-actions";

type QueueStatus = "pending" | "confirmed";

const copy = {
  en: {
    confirm: "Confirm attendance", complete: "Complete visit", saving: "Updating…",
    saved: "Updated", tooEarly: "Available near the appointment time",
    stale: "Changed elsewhere. Refreshing the schedule.",
    failed: "Could not update. Try again.",
  },
  ku: {
    confirm: "هاتن پشتڕاست بکەرەوە", complete: "سەردان تەواو بکە", saving: "نوێ دەکرێتەوە…",
    saved: "نوێکرایەوە", tooEarly: "نزیک کاتی وادەکە بەردەست دەبێت",
    stale: "لە شوێنێکی تر گۆڕدراوە. خشتەکە نوێ دەکرێتەوە.",
    failed: "نوێ نەکرایەوە. دووبارە هەوڵ بدە.",
  },
  bd: {
    confirm: "هاتنێ پشتڕاست بکە", complete: "سەردانێ تەمام بکە", saving: "دهێتە نووکرن…",
    saved: "هاتە نووکرن", tooEarly: "نێزیکی دەمێ وادەیێ بەردەست دبیت",
    stale: "ل جهەکێ دی هاتیە گۆڕین. خشتە دهێتە نووکرن.",
    failed: "نەهاتە نووکرن. جارەکا دی هەول بدە.",
  },
  ar: {
    confirm: "تأكيد الحضور", complete: "إنهاء الزيارة", saving: "جارٍ التحديث…",
    saved: "تم التحديث", tooEarly: "متاح قرب وقت الموعد",
    stale: "تغيّر الموعد بمكان آخر. جارٍ تحديث الجدول.",
    failed: "ما تم التحديث. حاول مرة ثانية.",
  },
} as const;

export function ClinicArrivalQuickAction({
  clinicId,
  appointmentId,
  patientName,
  revision,
  status,
  appointmentAt,
  locale,
}: {
  clinicId: string;
  appointmentId: string;
  patientName: string;
  revision: number;
  status: QueueStatus;
  appointmentAt: string;
  locale: UiLocale;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const requestInFlight = useRef(false);
  const t = copy[locale];
  const actionLabel = status === "pending" ? t.confirm : t.complete;

  useEffect(() => {
    const updateClock = () => setNow(Date.now());
    const interval = window.setInterval(updateClock, 30_000);
    document.addEventListener("visibilitychange", updateClock);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", updateClock);
    };
  }, []);

  const appointmentTime = Date.parse(appointmentAt);
  const completionReady = Number.isFinite(appointmentTime) && appointmentTime <= now + 5 * 60_000;
  const nextStatus = status === "pending" ? "confirmed" : "completed";
  const tooEarly = status === "confirmed" && !completionReady;

  function update() {
    if (requestInFlight.current || pending || done || tooEarly) return;
    requestInFlight.current = true;
    setError("");
    startTransition(async () => {
      try {
        const result = await updateAppointmentStatusInline(
          clinicId, appointmentId, status, revision, nextStatus,
        );
        if (!result.ok) {
          setError(result.reason === "stale" ? t.stale : result.reason === "too_early" ? t.tooEarly : t.failed);
          if (result.reason === "stale") router.refresh();
          return;
        }
        setDone(true);
        router.refresh();
      } catch {
        setError(t.failed);
      } finally {
        requestInFlight.current = false;
      }
    });
  }

  return (
    <div className="clinic-arrival-quick" aria-busy={pending}>
      <button
        type="button"
        className="clinic-arrival-quick-button"
        onClick={update}
        disabled={pending || done || tooEarly}
        aria-label={actionLabel + ": " + patientName}
        aria-describedby={tooEarly ? "clinic-quick-hint-" + appointmentId : undefined}
      >
        {pending ? t.saving : done ? t.saved : status === "pending" ? t.confirm : t.complete}
      </button>
      {tooEarly ? <span id={"clinic-quick-hint-" + appointmentId} className="clinic-arrival-quick-hint">{t.tooEarly}</span> : null}
      {error ? <span className="clinic-arrival-quick-error" role="alert">{error}</span> : null}
    </div>
  );
}
