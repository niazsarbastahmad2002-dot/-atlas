export type UiTheme = "light" | "dark" | "system";

export const defaultUiTheme: UiTheme = "light";

export function isUiTheme(value: string | undefined | null): value is UiTheme {
  return value === "light" || value === "dark" || value === "system";
}
