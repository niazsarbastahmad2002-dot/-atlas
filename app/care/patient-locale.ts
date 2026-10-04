import "server-only";

import { isUiLocale, type UiLocale } from "@/lib/i18n/ui";
import { getUiLocale } from "@/lib/i18n/ui-server";

type PatientLocaleParam = string | string[] | undefined;

export async function resolvePatientLocale(value: PatientLocaleParam): Promise<UiLocale> {
  if (typeof value === "string" && isUiLocale(value)) return value;
  return getUiLocale();
}

export function patientLocaleHref(
  path: string,
  locale: UiLocale,
  params: Record<string, string | undefined> = {},
) {
  const search = new URLSearchParams({ lang: locale });
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  return `${path}?${search.toString()}`;
}
