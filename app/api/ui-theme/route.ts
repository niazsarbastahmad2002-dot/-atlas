import { NextResponse } from "next/server";
import { isUiTheme } from "@/lib/i18n/ui-theme";
import { uiThemeCookie } from "@/lib/i18n/ui-theme-server";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const theme = typeof body === "object" && body && "theme" in body
    ? String((body as { theme?: unknown }).theme ?? "")
    : "";
  if (!isUiTheme(theme)) return NextResponse.json({ ok: false }, { status: 400 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(uiThemeCookie, theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });
  return response;
}
