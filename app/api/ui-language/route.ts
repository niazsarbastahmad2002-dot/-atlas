import { NextResponse } from "next/server";
import { isUiLocale, uiLocaleCookie, type UiLocale } from "@/lib/i18n/ui";

function applyUiLocaleCookie(response: NextResponse, locale: UiLocale) {
  response.cookies.set(uiLocaleCookie, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });
}

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale");
  const response = NextResponse.redirect(new URL("/care", request.url));
  if (isUiLocale(locale)) applyUiLocaleCookie(response, locale);
  return response;
}

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
  applyUiLocaleCookie(response, locale);
  return response;
}
