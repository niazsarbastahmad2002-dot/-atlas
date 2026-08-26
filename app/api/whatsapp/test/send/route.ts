import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  atlasWhatsAppRecipientAllowed,
  ATLAS_WHATSAPP_META_TEST_MODE,
  readAtlasWhatsAppRuntime,
} from "@/lib/reminders/whatsapp-runtime";
import {
  sendApprovedWhatsAppTemplate,
  sendWhatsAppAuthenticationTemplate,
  sendWhatsAppStaffInviteTemplate,
  sendWhatsAppTextMessage,
} from "@/lib/reminders/whatsapp";
import { constantTimeEqual } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TestRequest =
  | { kind: "otp"; recipientPhone: string; otp: string }
  | { kind: "invite"; recipientPhone: string; clinicName: string; inviteUrl: string }
  | {
      kind: "reminder";
      recipientPhone: string;
      clinicName: string;
      doctorName: string;
      appointmentAt: string;
      reminderKind: "confirm" | "day_of";
      language?: "en_US" | "ar";
      delayMinutes?: number;
    };

function authorized(request: Request) {
  const header = request.headers.get("authorization");
  const secret = process.env.WHATSAPP_TEST_ADMIN_SECRET?.trim();
  return Boolean(
    header?.startsWith("Bearer ")
    && secret
    && secret.length >= 24
    && constantTimeEqual(header.slice(7), secret),
  );
}

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "test_mode_forbidden" }, { status: 403 });
  }
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let runtimeConfig;
  try { runtimeConfig = readAtlasWhatsAppRuntime(); } catch {
    return NextResponse.json({ error: "service_not_configured" }, { status: 503 });
  }
  if (!runtimeConfig || runtimeConfig.mode !== ATLAS_WHATSAPP_META_TEST_MODE) {
    return NextResponse.json({ error: "test_mode_not_configured" }, { status: 503 });
  }

  let body: TestRequest;
  try { body = await request.json() as TestRequest; } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body || typeof body.recipientPhone !== "string" || !atlasWhatsAppRecipientAllowed(runtimeConfig, body.recipientPhone)) {
    return NextResponse.json({ error: "recipient_not_allowed" }, { status: 403 });
  }

  let result;
  if (body.kind === "otp") {
    result = await sendWhatsAppAuthenticationTemplate(
      body.recipientPhone,
      body.otp,
      runtimeConfig.otpTemplateName,
      runtimeConfig.config,
    );
    if (!result.accepted) {
      result = await sendWhatsAppTextMessage(
        body.recipientPhone,
        `Atlas test verification code: ${body.otp}. It expires soon.`,
        runtimeConfig.config,
      );
    }
  } else if (body.kind === "invite") {
    result = await sendWhatsAppStaffInviteTemplate(
      body.recipientPhone,
      body.clinicName,
      body.inviteUrl,
      runtimeConfig.staffInviteTemplateName,
      runtimeConfig.config,
    );
    if (!result.accepted) {
      result = await sendWhatsAppTextMessage(
        body.recipientPhone,
        `Atlas test invitation for ${body.clinicName}: ${body.inviteUrl}`,
        runtimeConfig.config,
      );
    }
  } else if (body.kind === "reminder") {
    result = await sendApprovedWhatsAppTemplate({
      recipientPhone: body.recipientPhone,
      clinicName: body.clinicName,
      doctorName: body.doctorName,
      appointmentAt: body.appointmentAt,
      reminderId: randomUUID(),
      messageKind: body.reminderKind,
      delayMinutes: body.delayMinutes ?? 0,
      templateName: body.reminderKind === "day_of" ? "atlas_visit_today_v1" : "atlas_visit_confirm_v1",
      templateLanguage: body.language ?? "en_US",
    }, runtimeConfig.config);
    if (!result.accepted) {
      result = await sendWhatsAppTextMessage(
        body.recipientPhone,
        `Atlas test reminder from ${body.clinicName}. Appointment with ${body.doctorName} at ${body.appointmentAt}.`,
        runtimeConfig.config,
      );
    }
  } else {
    return NextResponse.json({ error: "unsupported_kind" }, { status: 400 });
  }

  return NextResponse.json(result, {
    status: result.accepted ? 200 : result.retryable ? 503 : 502,
    headers: { "Cache-Control": "no-store" },
  });
}
