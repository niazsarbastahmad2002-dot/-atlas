import { cookies } from "next/headers";
import { defaultUiTheme, isUiTheme, type UiTheme } from "@/lib/i18n/ui-theme";

export const uiThemeCookie = "atlas_ui_theme";

export async function getUiTheme(): Promise<UiTheme> {
  const cookieStore = await cookies();
  const value = cookieStore.get(uiThemeCookie)?.value;
  return isUiTheme(value) ? value : defaultUiTheme;
}
