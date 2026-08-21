"use client";

import { LoginForm } from "@/app/login/login-form";
import type { UiLocale } from "@/lib/i18n/ui";

export function JoinClinicAuth({ token, locale }: {
  token: string;
  locale: UiLocale;
}) {
  return <LoginForm locale={locale} nextPath={`/join/${encodeURIComponent(token)}/finish`} />;
}
