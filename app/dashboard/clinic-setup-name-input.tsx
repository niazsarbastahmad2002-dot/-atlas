"use client";

import type { InputHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

type ClinicSetupNameInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "disabled"> & {
  disabled?: boolean;
};

export function ClinicSetupNameInput({ disabled = false, ...props }: ClinicSetupNameInputProps) {
  const { pending } = useFormStatus();
  return <input {...props} disabled={disabled || pending} aria-busy={pending || undefined} />;
}
