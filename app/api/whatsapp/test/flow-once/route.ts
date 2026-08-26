import { NextRequest, NextResponse } from "next/server";
import {
  ATLAS_WHATSAPP_META_TEST_MODE,
  readAtlasWhatsAppRuntime,
} from "@/lib/reminders/whatsapp-runtime";
import {
  sendApprovedWhatsAppTemplate,
  sendWhatsAppAuthenticationTemplate,
  sendWhatsAppStaffInviteTemplate,
  sendWhatsAppTextMessage,
} from "@/lib/reminders/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function withTextFallback(
  primary: () => Promise<{ accepted: boolean; errorCode?: string }>,
  fallback: () => Promise<{ accepted: boolean; errorCode?: string }>,
) {
  const first = await primary();
  if (first.accepted) return { accepted: true, path: "template" as const };
  const second = await fallback();
  return {
    accepted: second.accepted,
    path: second.accepted ? "text_fallback" as const : "failed" as const,
    templateError: first.errorCode ?? null,
    fallbackError: second.errorCode ?? null,
  };
}

export async function GET(request: NextRequest) {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (request.nextUrl.searchParams.get("key") !== "atlas-flow-check") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const recipient = request.nextUrl.searchParams.get("recipient") ?? "";
  if (!/^\+9647\d{9}$/.test(recipient)) {
    return NextResponse.json({ error: "invalid_recipient" }, { status: 400 });
  }

  let runtimeConfig;
  try {
    runtimeConfig = readAtlasWhatsAppRuntime();
  } catch {
    return NextResponse.json({ error: "service_not_configured" }, { status: 503 });
  }
  if (!runtimeConfig || runtimeConfig.mode !== ATLAS_WHATSAPP_META_TEST_MODE) {
    return NextResponse.json({ error: "test_mode_not_configured" }, { status: 503 });
  }

  const inviteUrl = `https://${process.env.VERCEL_URL ?? "example.vercel.app"}/join/test-preview-only`;

  const otp = await withTextFallback(
    () => sendWhatsAppAuthenticationTemplate(recipient, "483921", runtimeConfig.otpTemplateName, runtimeConfig.config),
    () => sendWhatsAppTextMessage(recipient, "Atlas test verification code: 483921. This is only a test code.", runtimeConfig.config),
  );

  const invite = await withTextFallback(
    () => sendWhatsAppStaffInviteTemplate(recipient, "Atlas Test Clinic", inviteUrl, runtimeConfig.staffInviteTemplateName, runtimeConfig.config),
    () => sendWhatsAppTextMessage(recipient, `Atlas test staff invitation for Atlas Test Clinic: ${inviteUrl}`, runtimeConfig.config),
  );

  const firstReminder = await sendApprovedWhatsAppTemplate({
    recipientPhone: recipient,
    clinicName: "Atlas Test Clinic",
    doctorName: "Dr. Atlas",
    appointmentAt: "tomorrow at 10:00 AM",
    reminderId: "00000000-0000-4000-8000-000000000001",
    messageKind: "confirm",
    delayMinutes: 0,
    templateName: "atlas_visit_confirm_v1",
    templateLanguage: "en_US",
  }, runtimeConfig.config);
  const fallbackReminder = firstReminder.accepted
    ? null
    : await sendWhatsAppTextMessage(recipient, "Atlas test reminder: appointment with Dr. Atlas tomorrow at 10:00 AM. This is only a test reminder.", runtimeConfig.config);
  const reminder = {
    accepted: firstReminder.accepted || fallbackReminder?.accepted === true,
    path: firstReminder.accepted ? "template" : fallbackReminder?.accepted ? "text_fallback" : "failed",
    templateError: firstReminder.accepted ? null : firstReminder.errorCode ?? null,
    fallbackError: fallbackReminder && !fallbackReminder.accepted ? fallbackReminder.errorCode ?? null : null,
  };

  const ok = otp.accepted && invite.accepted && reminder.accepted;
  return NextResponse.json({ ok, otp, invite, reminder }, {
    status: ok ? 200 : 502,
    headers: { "Cache-Control": "no-store" },
  });
}
