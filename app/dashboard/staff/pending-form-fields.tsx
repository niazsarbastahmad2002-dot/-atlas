"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function PendingFormFields({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <fieldset className="pending-form-fields" disabled={pending} aria-busy={pending}>
      {children}
    </fieldset>
  );
}
