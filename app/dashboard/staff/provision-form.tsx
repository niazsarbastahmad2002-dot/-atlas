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
        <label htmlFor="email">Staff email</label>
        <input id="email" name="email" type="email" autoComplete="email" maxLength={254} dir="ltr" required />
        <label htmlFor="role">Role</label>
        <select id="role" name="role" defaultValue="receptionist">
          <option value="receptionist">Receptionist</option>
          <option value="manager">Manager</option>
        </select>
        <button className="button" type="submit" disabled={pending}>
          {pending ? "Preparing access…" : "Prepare staff access"}
        </button>
      </form>

      {state.message ? (
        <div className={`notice ${state.status === "success" ? "notice-success" : "notice-error"}`} role={state.status === "success" ? "status" : "alert"}>
          <strong>{state.message}</strong>
          {state.status === "success" && state.code ? (
            <div style={{ marginTop: 12 }}>
              <div className="field-help" dir="ltr">{state.email}</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: ".18em" }} dir="ltr">{state.code}</div>
              <div className="field-help">The receptionist enters this once on the Atlas welcome screen. No email link is sent.</div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
