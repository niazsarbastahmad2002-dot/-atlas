"use client";

import { useState, type FormEvent, type ReactNode } from "react";

type PublicBookingWeekFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  weekdays: readonly string[];
  invalidRange: string;
};

export function PublicBookingWeekForm({
  action,
  children,
  weekdays,
  invalidRange,
}: PublicBookingWeekFormProps) {
  const [invalidDay, setInvalidDay] = useState<string | null>(null);

  function validateWeek(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const values = new FormData(form);

    // The existing server action validates all seven saved ranges,
    // including inactive days. Keep the browser check aligned with it.
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const start = String(values.get(`day_${weekday}_start`) ?? "");
      const end = String(values.get(`day_${weekday}_end`) ?? "");
      if (start && end && start >= end) {
        event.preventDefault();
        setInvalidDay(weekdays[weekday]);
        form.querySelector<HTMLInputElement>(`[name="day_${weekday}_end"]`)?.focus();
        return;
      }
    }
    setInvalidDay(null);
  }

  return (
    <form
      action={action}
      className="settings-form"
      onSubmit={validateWeek}
      onChange={() => setInvalidDay(null)}
    >
      {children}
      {invalidDay ? (
        <p className="notice notice-error public-booking-validation" role="alert">
          {invalidRange.replace("{day}", invalidDay)}
        </p>
      ) : null}
    </form>
  );
}
