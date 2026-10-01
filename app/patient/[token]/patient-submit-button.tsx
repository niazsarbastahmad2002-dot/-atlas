"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type PatientSubmitButtonProps = {
  children: ReactNode;
  pendingLabel: string;
  className?: string;
  formAction: (formData: FormData) => void | Promise<void>;
};

export function PatientSubmitButton({
  children,
  pendingLabel,
  className,
  formAction,
}: PatientSubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      type="submit"
      formAction={formAction}
      disabled={pending}
      aria-disabled={pending}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
