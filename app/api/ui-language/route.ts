import { NextResponse } from "next/server";
import { isUiLocale } from "@/lib/i18n/ui";
import { uiLocaleCookie } from "@/lib/i18n/ui-server";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const locale = typeof body === "object" && body && "locale" in body
    ? String((body as { locale?: unknown }).locale ?? "")
    : "";
  if (!isUiLocale(locale)) return NextResponse.json({ ok: false }, { status: 400 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(uiLocaleCookie, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });
  return response;
}
