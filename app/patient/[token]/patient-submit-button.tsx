"use client";

import { useEffect, useState, type ReactNode } from "react";
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
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const disabled = pending || Boolean(confirmMessage && !hydrated);

  return (
    <button
      className={className}
      type="submit"
      formAction={formAction}
      disabled={disabled}
      aria-disabled={disabled}
      onClick={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
