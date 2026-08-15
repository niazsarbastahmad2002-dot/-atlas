"use client";

import { useActionState } from "react";
import { provisionStaffMember, type StaffProvisionState } from "./actions";

const initialState: StaffProvisionState = { status: "idle", message: "" };

export function StaffProvisionForm({ clinicId }: { clinicId: string }) {
  const [state, action, pending] = useActionState(provisionStaffMember, initialState);

  return (
    <div className="settings-form">
      <form action={action} className="settings-form">
        <input type="hidden" name="clinic_id" value={clinicId} />
        <input type="hidden" name="role" value="receptionist" />
        <label htmlFor="email">Receptionist work email</label>
        <input id="email" name="email" type="email" autoComplete="email" maxLength={254} dir="ltr" required />
        <button className="button" type="submit" disabled={pending}>
          {pending ? "Adding receptionist…" : "Add receptionist"}
        </button>
        <p className="field-help">They will sign in from the normal Atlas screen with their email verification code. No clinic setup code is needed.</p>
      </form>

      {state.message ? (
        <div className={`notice ${state.status === "success" ? "notice-success" : "notice-error"}`} role={state.status === "success" ? "status" : "alert"}>
          <strong>{state.message}</strong>
          {state.status === "success" && state.email ? <div className="field-help" dir="ltr">{state.email}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
