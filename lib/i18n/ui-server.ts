import { cookies } from "next/headers";
import { defaultUiLocale, isUiLocale, type UiLocale } from "@/lib/i18n/ui";

export const uiLocaleCookie = "atlas_ui_locale";

export async function getUiLocale(): Promise<UiLocale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(uiLocaleCookie)?.value;
  return isUiLocale(value) ? value : defaultUiLocale;
}
