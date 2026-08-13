"use client";

import { useActionState } from "react";
import { requestMagicLink, type LoginState } from "./actions";

const initialState: LoginState = { status: "idle", message: "" };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(requestMagicLink, initialState);
  const isLocked = isPending || state.status === "sent" || state.status === "rate-limited";

  let buttonLabel = "Send sign-in link";
  if (isPending) buttonLabel = "Sending…";
  if (state.status === "sent") buttonLabel = "Link sent";
  if (state.status === "rate-limited") buttonLabel = "Try again later";

  return (
    <>
      {state.message ? (
        <p
          className={`notice ${state.status === "sent" ? "notice-success" : "notice-error"}`}
          role={state.status === "sent" ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}

      <form action={formAction} className="stack-form">
        <label htmlFor="email">Work email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="clinic@example.com"
          required
        />
        <button className="button" type="submit" disabled={isLocked}>{buttonLabel}</button>
      </form>
    </>
  );
}
