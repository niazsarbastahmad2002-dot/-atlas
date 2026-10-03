"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
  disabled?: boolean;
  lockForm?: boolean;
};

export function SubmitButton({
  children,
  pendingLabel,
  className = "button",
  disabled = false,
  lockForm = false,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isDisabled = pending || disabled;

  useEffect(() => {
    if (!lockForm || !pending) return;
    const form = buttonRef.current?.form;
    if (!form) return;
    const wasInert = form.inert;
    form.inert = true;
    return () => {
      if (form.isConnected) form.inert = wasInert;
    };
  }, [lockForm, pending]);

  return (
    <button ref={buttonRef} className={className} type="submit" disabled={isDisabled} aria-disabled={isDisabled}>
      {pending ? pendingLabel : children}
    </button>
  );
}
