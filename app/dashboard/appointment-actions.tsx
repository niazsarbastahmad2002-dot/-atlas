"use client";

import { useFormStatus } from "react-dom";
import {
  allowedAppointmentTransitions,
  type AppointmentStatus,
} from "@/lib/appointments";
import { uiText, type UiLocale } from "@/lib/i18n/ui";
import { archiveAppointment } from "./actions";
import { updateAppointmentStatusReliable } from "./status-actions";
import { PatientLinkButton } from "./patient-link-button";

function ActionSubmit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? pendingLabel : label}</button>;
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
  const t = uiText(locale);
  const labels: Record<AppointmentStatus, string> = {
    pending: t.reopen,
    confirmed: t.confirm,
    cancelled: t.cancel,
    completed: t.complete,
    no_show: t.noShow,
  };
  const archiveQuestion = locale === "ku"
    ? "ئەم وادەیە ئەرشیف بکرێت؟ مێژووەکەی دەپارێزرێت."
    : locale === "ar"
      ? "أرشفة هذا الموعد؟ سيتم الاحتفاظ بسجله."
      : "Archive this appointment? Its history will be retained.";

  return (
    <div className="row-actions polished-actions" aria-label="Appointment actions">
      {allowedAppointmentTransitions(status).map((nextStatus) => (
        <form action={updateAppointmentStatusReliable.bind(null, clinicId, appointmentId, nextStatus)} key={nextStatus}>
          <ActionSubmit label={labels[nextStatus]} pendingLabel={t.saving} />
        </form>
      ))}
      <PatientLinkButton clinicId={clinicId} appointmentId={appointmentId} locale={locale} />
      <form
        className="archive-action"
        action={archiveAppointment.bind(null, clinicId, appointmentId)}
        onSubmit={(event) => {
          if (!window.confirm(archiveQuestion)) event.preventDefault();
        }}
      >
        <ActionSubmit label={t.archive} pendingLabel={t.saving} />
      </form>
    </div>
  );
}
