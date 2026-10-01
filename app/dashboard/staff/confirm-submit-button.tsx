"use client";

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

  return (
    <button
      className={className}
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
