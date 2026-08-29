import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { normalizeAuthPhone } from "@/lib/phone-auth";
import {
  atlasWhatsAppRecipientAllowed,
  ATLAS_WHATSAPP_META_TEST_MODE,
  readAtlasWhatsAppRuntime,
} from "@/lib/reminders/whatsapp-runtime";
import {
  sendWhatsAppStaffInviteTemplate,
  sendWhatsAppTextMessage,
} from "@/lib/reminders/whatsapp";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RpcResult = { data: unknown; error: { message?: string; code?: string } | null };
type Rpc = (name: string, args: Record<string, unknown>) => Promise<RpcResult>;

const NONCE = "Dz5PwrjfXN2tXHtCLeJLyqvpNRTjIJp0YInb7VJ3G_I";
const CLINIC_ID = "384db8d5-57d8-4600-836b-152385460bc1";
const DOCTOR_ID = "e5f6dd34-2cfc-4c34-a86d-d9ad3797bc60";
const OWNER_ID = "5048347e-83c5-43c8-97c7-687cd2e75328";
const RECIPIENT_USER_ID = "babad9c0-1e79-457b-a20f-8911eaa5ebcc";

function previewOrigin() {
  const host = process.env.VERCEL_BRANCH_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (!host) return null;
  return `https://${host.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "preview_only" }, { status: 403 });
  }
  if (process.env.ATLAS_WHATSAPP_MODE !== ATLAS_WHATSAPP_META_TEST_MODE) {
    return NextResponse.json({ error: "wrong_mode" }, { status: 403 });
  }
  if (requestUrl.searchParams.get("nonce") !== NONCE) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const runtimeConfig = readAtlasWhatsAppRuntime();
  const origin = previewOrigin();
  if (!runtimeConfig || runtimeConfig.mode !== ATLAS_WHATSAPP_META_TEST_MODE || !origin) {
    return NextResponse.json({ error: "not_ready" }, { status: 503 });
  }

  const admin = createAdminClient();
  const { data: recipientData, error: recipientError } = await admin.auth.admin.getUserById(RECIPIENT_USER_ID);
  const recipientPhone = normalizeAuthPhone(recipientData.user?.phone ?? "");
  if (recipientError || !recipientPhone || !atlasWhatsAppRecipientAllowed(runtimeConfig, recipientPhone)) {
    return NextResponse.json({ error: "recipient_not_ready" }, { status: 403 });
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invitedPhoneHash = createHash("sha256").update(recipientPhone).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const rpc: Rpc = (name, args) => (admin.rpc as unknown as Rpc).call(admin, name, args);

  const created = await rpc("create_phone_staff_invite_link_service", {
    p_clinic_id: CLINIC_ID,
    p_assigned_doctor_id: DOCTOR_ID,
    p_token_hash: tokenHash,
    p_invited_phone_hash: invitedPhoneHash,
    p_created_by: OWNER_ID,
    p_expires_at: expiresAt,
  });
  if (created.error || typeof created.data !== "string") {
    return NextResponse.json({ error: "create_failed", code: created.error?.code ?? null }, { status: 500 });
  }

  const inviteUrl = `${origin}/join/${token}?lang=ku`;
  let sent = await sendWhatsAppStaffInviteTemplate(
    recipientPhone,
    "Hello",
    inviteUrl,
    runtimeConfig.staffInviteTemplateName,
    runtimeConfig.config,
  );
  if (!sent.accepted) {
    sent = await sendWhatsAppTextMessage(
      recipientPhone,
      `Atlas test invitation for Hello: ${inviteUrl}`,
      runtimeConfig.config,
    );
  }
  if (!sent.accepted) {
    return NextResponse.json({ error: "send_failed", code: sent.errorCode }, { status: sent.retryable ? 503 : 502 });
  }

  const activated = await rpc("activate_phone_staff_invite_link_service", {
    p_token_hash: tokenHash,
    p_provider_message_id: sent.providerMessageId,
    p_created_by: OWNER_ID,
  });
  if (activated.error || activated.data !== true) {
    return NextResponse.json({ error: "activate_failed", code: activated.error?.code ?? null }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    language: "ku",
    providerAccepted: true,
    inviteUrl,
    expiresAt,
  }, { headers: { "Cache-Control": "no-store" } });
}
