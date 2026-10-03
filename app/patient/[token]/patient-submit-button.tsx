"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type PatientSubmitButtonProps = {
  children: ReactNode;
  pendingLabel: string;
  className?: string;
  formAction: (formData: FormData) => void | Promise<void>;
  confirmMessage?: string;
};

export function PatientSubmitButton({
  children,
  pendingLabel,
  className,
  formAction,
  confirmMessage,
}: PatientSubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      type="submit"
      formAction={formAction}
      disabled={pending}
      aria-disabled={pending}
      onClick={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
