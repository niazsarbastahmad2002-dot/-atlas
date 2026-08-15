"use client";

import { useFormStatus } from "react-dom";
import {
  allowedAppointmentTransitions,
  type AppointmentStatus,
} from "@/lib/appointments";
import { archiveAppointment, updateAppointmentStatus } from "./actions";
import { PatientLinkButton } from "./patient-link-button";

const actionLabels: Record<AppointmentStatus, string> = {
  pending: "Reopen",
  confirmed: "Confirm",
  cancelled: "Cancel",
  completed: "Complete",
  no_show: "No-show",
};

function ActionSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? "Saving…" : label}</button>;
}

export function AppointmentActions({
  clinicId,
  appointmentId,
  status,
}: {
  clinicId: string;
  appointmentId: string;
  status: AppointmentStatus;
}) {
  return (
    <div className="row-actions" aria-label="Appointment actions">
      {allowedAppointmentTransitions(status).map((nextStatus) => (
        <form action={updateAppointmentStatus.bind(null, clinicId, appointmentId, nextStatus)} key={nextStatus}>
          <ActionSubmit label={actionLabels[nextStatus]} />
        </form>
      ))}
      <PatientLinkButton clinicId={clinicId} appointmentId={appointmentId} />
      <form
        action={archiveAppointment.bind(null, clinicId, appointmentId)}
        onSubmit={(event) => {
          if (!window.confirm("Archive this appointment? Its history will be retained.")) event.preventDefault();
        }}
      >
        <ActionSubmit label="Archive" />
      </form>
    </div>
  );
}
