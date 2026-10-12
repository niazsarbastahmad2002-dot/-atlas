"use client";

import { useEffect, useState } from "react";
import { toBaghdadInputValue } from "@/lib/appointments";
import { baghdadDate } from "@/lib/i18n/config";
import { formatTimeValue, localizeDigits } from "@/lib/i18n/format";
import type { UiLocale } from "@/lib/i18n/ui";
import { clinicPriorities, type ClinicAttentionAppointment } from "@/lib/clinic-priorities";
import { ClinicArrivalQuickAction } from "./clinic-arrival-quick-action";

type PriorityAppointment = ClinicAttentionAppointment & {
  patient_name: string;
  appointment_revision: number;
};

const copy: Record<UiLocale, {
  eyebrow: string; title: string; subtitle: string; attendance: string; finish: string; soon: string;
  attendanceHint: string; finishHint: string; soonHint: string; open: string; total: string;
}> = {
  en: { eyebrow: "Right now", title: "What needs attention", subtitle: "Based on appointment times, not automatic arrival or no-show decisions.", attendance: "Check attendance", finish: "Visit status to review", soon: "Coming within an hour", attendanceHint: "Scheduled time passed; attendance is not confirmed.", finishHint: "Attendance is confirmed; the scheduled time has passed.", soonHint: "Next active appointment within 60 minutes.", open: "Open appointment", total: "in this group" },
  ku: { eyebrow: "ئێستا", title: "ئەو کارانەی پێویستیان بە سەرنجە", subtitle: "بەپێی کاتی وادەکانە، نە بڕیاری خۆکاری دەربارەی هاتن یان نەهاتن.", attendance: "هاتن بپشکنە", finish: "دۆخی سەردان بپشکنە", soon: "لە ماوەی کاتژمێرێکدا", attendanceHint: "کاتی وادەکە تێپەڕیوە و هاتن پشتڕاست نەکراوە.", finishHint: "هاتن پشتڕاستکراوە و کاتی وادەکە تێپەڕیوە.", soonHint: "وادەی چالاکی داهاتوو لە ماوەی ٦٠ خولەکدا.", open: "وادەکە بکەرەوە", total: "لەو بەشەدا" },
  bd: { eyebrow: "نوکە", title: "کارێن پێدڤی بە سەرنجێ", subtitle: "ل دویڤ دەمێ وادەیانە، نە بڕیارا خودکار یا هاتن یان نەهاتنێ.", attendance: "هاتنێ بپشکنە", finish: "بارێ سەردانێ بپشکنە", soon: "د ناڤ کاتژمێرەکێدا", attendanceHint: "دەمێ وادەیێ دەرباس بوویە و هاتن نەهاتیە پشتڕاستکرن.", finishHint: "هاتن پشتڕاستکریە و دەمێ وادەیێ دەرباس بوویە.", soonHint: "وادەیا چالاکا پاشێ د ناڤ ٦٠ خولەکاندا.", open: "وادەیێ ڤەکە", total: "د ڤێ بەشێدا" },
  ar: { eyebrow: "هسه", title: "الأمور اللي تحتاج متابعة", subtitle: "حسب وقت الموعد، مو حكم تلقائي على حضور المريض أو غيابه.", attendance: "راجع الحضور", finish: "راجع حالة الزيارة", soon: "خلال الساعة الجاية", attendanceHint: "وقت الموعد مرّ، والحضور بعده غير مؤكد.", finishHint: "الحضور مؤكد، ووقت الموعد مرّ.", soonHint: "موعد نشط خلال ٦٠ دقيقة القادمة.", open: "افتح الموعد", total: "بهذه المجموعة" },
};

function appointmentHref(clinicId: string, day: string, doctorId: string | null, status: string, appointmentId: string) {
  const params = new URLSearchParams({ clinic: clinicId, day, focus: status });
  if (doctorId) params.set("doctor", doctorId);
  return `/dashboard?${params.toString()}#atlas-appointment-${appointmentId}`;
}

export function ClinicPriorityBoard({
  appointments,
  clinicId,
  selectedDay,
  selectedDoctorId,
  locale,
  nowAtRender,
}: {
  appointments: PriorityAppointment[];
  clinicId: string;
  selectedDay: string;
  selectedDoctorId: string | null;
  locale: UiLocale;
  nowAtRender: number;
}) {
  const [now, setNow] = useState(nowAtRender);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 30_000);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  const isToday = baghdadDate.format(new Date(now)) === selectedDay;
  const priorities = clinicPriorities(appointments, now, isToday);
  if (priorities.length === 0) return null;
  const t = copy[locale];

  return <section className="clinic-priority-board" aria-labelledby="clinic-priority-heading">
    <div className="clinic-priority-heading">
      <div className="eyebrow">{t.eyebrow}</div>
      <h2 id="clinic-priority-heading">{t.title}</h2>
      <p>{t.subtitle}</p>
    </div>
    <div className="clinic-priority-grid">
      {priorities.map(({ kind, appointment, count }) => {
        const label = kind === "attendance" ? t.attendance : kind === "finish" ? t.finish : t.soon;
        const hint = kind === "attendance" ? t.attendanceHint : kind === "finish" ? t.finishHint : t.soonHint;
        const href = appointmentHref(clinicId, selectedDay, selectedDoctorId, appointment.status, appointment.id);
        return <article key={kind} className={`clinic-priority-card is-${kind}`}>
          <div className="clinic-priority-top"><strong>{label}</strong><span>{localizeDigits(count, locale)} {t.total}</span></div>
          <a className="clinic-priority-patient" href={href}>
            <span data-atlas-user-content="true">{appointment.patient_name}</span>
            <bdi dir="ltr">{formatTimeValue(toBaghdadInputValue(new Date(appointment.appointment_at)).slice(11, 16), locale)}</bdi>
          </a>
          <p>{hint}</p>
          <div className="clinic-priority-actions">
            {kind !== "soon" ? <ClinicArrivalQuickAction
              key={`${appointment.id}:${appointment.appointment_revision}:${kind}`}
              clinicId={clinicId}
              appointmentId={appointment.id}
              patientName={appointment.patient_name}
              revision={appointment.appointment_revision}
              status={kind === "attendance" ? "pending" : "confirmed"}
              appointmentAt={appointment.appointment_at}
              locale={locale}
            /> : null}
            <a href={href}>{t.open} <span aria-hidden="true">↗</span></a>
          </div>
        </article>;
      })}
    </div>
  </section>;
}
