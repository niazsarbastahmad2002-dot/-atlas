"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

export function ConfirmSubmitButton({
  children,
  pendingLabel,
  confirmMessage,
  className = "button",
}: {
  children: React.ReactNode;
  pendingLabel: string;
  confirmMessage: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const disabled = pending || !hydrated;

  return (
    <button
      className={className}
      type="submit"
      disabled={disabled}
      aria-disabled={disabled}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
