"use client";

import { useFormStatus } from "react-dom";

type PendingTextInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "disabled"> & {
  disabled?: boolean;
};

export function PendingTextInput({ disabled = false, ...props }: PendingTextInputProps) {
  const { pending } = useFormStatus();
  return <input {...props} disabled={disabled || pending} aria-busy={pending || undefined} />;
}
