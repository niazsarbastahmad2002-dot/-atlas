"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
  disabled?: boolean;
};

export function SubmitButton({
  children,
  pendingLabel,
  className = "button",
  disabled = false,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;
  return (
    <button className={className} type="submit" disabled={isDisabled} aria-disabled={isDisabled}>
      {pending ? pendingLabel : children}
    </button>
  );
}
