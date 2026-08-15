"use client";

import { useActionState } from "react";
import { uiText, type UiLocale } from "@/lib/i18n/ui";
import { requestMagicLink, type LoginState } from "./actions";

const initialState: LoginState = { status: "idle", message: "" };

export function LoginForm({ locale }: { locale: UiLocale }) {
  const t = uiText(locale);
  const [state, formAction, isPending] = useActionState(requestMagicLink, initialState);
  const isLocked = isPending || state.status === "sent" || state.status === "rate-limited";

  let buttonLabel: string = t.sendLink;
  if (isPending) buttonLabel = t.sending;
  if (state.status === "sent") buttonLabel = t.linkSent;
  if (state.status === "rate-limited") buttonLabel = t.tryLater;

  return (
    <div className="email-fallback">
      {state.message ? (
        <p
          className={`notice ${state.status === "sent" ? "notice-success" : "notice-error"}`}
          role={state.status === "sent" ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}

      <details className="email-fallback-details" open={state.status !== "idle"}>
        <summary>{t.emailFallback}</summary>
        <form action={formAction} className="stack-form login-email-form">
          <label htmlFor="email">{t.workEmail}</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="clinic@example.com"
            dir="ltr"
            required
          />
          <button className="button button-ghost" type="submit" disabled={isLocked}>{buttonLabel}</button>
        </form>
      </details>
    </div>
  );
}
