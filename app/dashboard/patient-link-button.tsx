"use client";

import { useActionState, useState } from "react";
import {
  createPatientAccessLink,
  initialPatientLinkState,
} from "./patient-link-actions";

export function PatientLinkButton({
  clinicId,
  appointmentId,
}: {
  clinicId: string;
  appointmentId: string;
}) {
  const [state, action, pending] = useActionState(
    createPatientAccessLink,
    initialPatientLinkState,
  );
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    if (!state.link) return;
    await navigator.clipboard.writeText(state.link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="patient-link-control">
      <form action={action}>
        <input type="hidden" name="clinic_id" value={clinicId} />
        <input type="hidden" name="appointment_id" value={appointmentId} />
        <button type="submit" disabled={pending}>
          {pending ? "Creating link…" : "Patient link"}
        </button>
      </form>
      {state.error ? <span className="field-help" role="alert">{state.error}</span> : null}
      {state.link ? (
        <div className="patient-link-result">
          <input aria-label="Patient self-service link" readOnly value={state.link} />
          <button type="button" onClick={copyLink}>{copied ? "Copied" : "Copy"}</button>
        </div>
      ) : null}
    </div>
  );
}
