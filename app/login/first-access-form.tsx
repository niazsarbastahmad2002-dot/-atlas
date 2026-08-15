"use client";

import { useActionState, useEffect } from "react";
import { signInWithSetupCode, type SetupCodeState } from "./actions";

const initialState: SetupCodeState = { status: "idle", message: "" };

export function FirstAccessForm() {
  const [state, action, pending] = useActionState(signInWithSetupCode, initialState);

  useEffect(() => {
    if (state.status === "authenticated") {
      window.location.assign("/onboarding/device");
    }
  }, [state.status]);

  return (
    <div className="first-access-form">
      <form action={action} className="stack-form">
        <label htmlFor="first-access-email">Work email</label>
        <input
          id="first-access-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="reception@clinic.com"
          dir="ltr"
          required
        />

        <label htmlFor="setup-code">Atlas setup code</label>
        <input
          id="setup-code"
          name="setup_code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{8}"
          maxLength={8}
          placeholder="12345678"
          dir="ltr"
          required
        />

        <button className="button" type="submit" disabled={pending}>
          {pending ? "Checking…" : "Continue"}
        </button>
      </form>

      <p className="field-help">Your clinic owner gives you this short code once. Atlas does not send an email link.</p>
      {state.status === "error" ? <p className="notice notice-error" role="alert">{state.message}</p> : null}
    </div>
  );
}
