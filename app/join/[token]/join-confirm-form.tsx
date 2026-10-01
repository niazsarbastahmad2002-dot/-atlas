"use client";

import { useRef, useState, type FormEvent } from "react";

export function JoinConfirmForm({
  action,
  label,
  pendingLabel,
}: {
  action: string;
  label: string;
  pendingLabel: string;
}) {
  const submitted = useRef(false);
  const [pending, setPending] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    if (submitted.current) {
      event.preventDefault();
      return;
    }
    submitted.current = true;
    setPending(true);
  }

  return (
    <form method="post" action={action} onSubmit={submit}>
      <button className="button" type="submit" disabled={pending} aria-disabled={pending}>
        {pending ? pendingLabel : label}
      </button>
    </form>
  );
}
