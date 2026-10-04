import { NextRequest, NextResponse } from "next/server";
import {
  clearPatientAccountCookie,
  patientAccountCookieName,
  revokePatientAccountSession,
} from "@/lib/patient-account-session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("lang") ?? "en";
  const token = request.cookies.get(patientAccountCookieName)?.value ?? "";
  try {
    const admin = createAdminClient();
    await revokePatientAccountSession(admin, token);
  } catch {
    // Clearing the browser cookie is still safe if the database is temporarily unavailable.
  }

  const destination = new URL("/patient-account", request.url);
  destination.searchParams.set("lang", locale);
  const response = NextResponse.redirect(destination, 303);
  clearPatientAccountCookie(response);
  return response;
}
