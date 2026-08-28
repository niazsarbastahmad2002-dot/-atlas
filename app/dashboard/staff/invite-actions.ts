"use server";

import { createHash, randomBytes } from "node:crypto";
import { isUuid } from "@/lib/appointments";
import { normalizeAuthPhone } from "@/lib/phone-auth";
import { readClinicMetaWhatsAppConfig } from "@/lib/reminders/meta-clinic-config";
import {
  atlasWhatsAppRecipientAllowed,
  ATLAS_WHATSAPP_META_TEST_MODE,
  ATLAS_WHATSAPP_STAFF_INVITE_TEMPLATE,
  readAtlasWhatsAppRuntime,
} from "@/lib/reminders/whatsapp-runtime";
import {
  sendWhatsAppStaffInviteTemplate,
  sendWhatsAppTextMessage,
  type WhatsAppConfig,
} from "@/lib/reminders/whatsapp";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type InviteLinkState = {
  status: "idle" | "success" | "error";
  message: string;
  url?: string;
};

type RpcResult = { data: unknown; error: { message?: string; code?: string } | null };
type Rpc = (name: string, args: Record<string, unknown>) => Promise<RpcResult>;
type AdminClient = ReturnType<typeof createAdminClient>;

type InviteWhatsAppDelivery = {
  config: WhatsAppConfig;
  templateName: string;
  testMode: boolean;
};

function atlasSiteUrl() {
  const metaTestPreview = process.env.ATLAS_WHATSAPP_MODE === ATLAS_WHATSAPP_META_TEST_MODE
    && process.env.VERCEL_ENV !== "production";
  if (metaTestPreview) {
    const previewHost = process.env.VERCEL_BRANCH_URL?.trim() || process.env.VERCEL_URL?.trim();
    if (previewHost) return `https://${previewHost.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }

  const configured = process.env.SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.VERCEL_ENV !== "production") {
    const previewHost = process.env.VERCEL_BRANCH_URL?.trim() || process.env.VERCEL_URL?.trim();
    if (previewHost) return `https://${previewHost.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) return `https://${productionHost.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

function directInvitesEnabled() {
  return process.env.WHATSAPP_DIRECT_INVITES_ENABLED === "true"
    || (process.env.ATLAS_WHATSAPP_MODE === ATLAS_WHATSAPP_META_TEST_MODE && process.env.VERCEL_ENV !== "production");
}

async function resolveInviteWhatsAppDelivery(
  admin: AdminClient,
  clinicId: string,
  recipientPhone: string,
): Promise<InviteWhatsAppDelivery | null> {
  const requestedMode = process.env.ATLAS_WHATSAPP_MODE?.trim().toLowerCase() || "production";
  if (requestedMode === ATLAS_WHATSAPP_META_TEST_MODE) {
    const runtime = readAtlasWhatsAppRuntime();
    if (!runtime || runtime.mode !== ATLAS_WHATSAPP_META_TEST_MODE) return null;
    if (!atlasWhatsAppRecipientAllowed(runtime, recipientPhone)) return null;
    return { config: runtime.config, templateName: runtime.staffInviteTemplateName, testMode: true };
  }

  // Production delivery stays clinic-scoped and therefore keeps the existing
  // real +964 Coexistence sender. Test credentials never replace this row.
  const clinicConnection = await readClinicMetaWhatsAppConfig(admin, clinicId);
  if (!clinicConnection) return null;
  return {
    config: clinicConnection.config,
    templateName: process.env.WHATSAPP_STAFF_INVITE_TEMPLATE?.trim() || ATLAS_WHATSAPP_STAFF_INVITE_TEMPLATE,
    testMode: false,
  };
}

async function inviteIsActive(rpc: Rpc, tokenHash: string) {
  const { data, error } = await rpc("preview_staff_invite_link_service", {
    p_token_hash: tokenHash,
  });
  return !error && Array.isArray(data) && data.length > 0;
}

export async function createReceptionistInviteLink(
  _previous: InviteLinkState,
  formData: FormData,
): Promise<InviteLinkState> {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const doctorId = String(formData.get("assigned_doctor_id") ?? "");
  const rawRecipientPhone = String(formData.get("recipient_phone") ?? "").trim();
  const recipientPhone = rawRecipientPhone ? normalizeAuthPhone(rawRecipientPhone) : null;

  if (!isUuid(clinicId) || !isUuid(doctorId)) {
    return { status: "error", message: "Choose the receptionist's doctor first." };
  }
  if (!directInvitesEnabled()) {
    return { status: "error", message: "Secure WhatsApp staff invitations are not enabled yet for this environment." };
  }
  if (!recipientPhone) {
    return { status: "error", message: "Enter a valid mobile number for the WhatsApp invitation." };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { status: "error", message: "Sign in again before creating an invitation." };
  }

  const [{ data: clinic }, { data: doctor }] = await Promise.all([
    supabase.from("clinics").select("id, owner_id, name").eq("id", clinicId).maybeSingle(),
    supabase.from("doctors").select("id").eq("id", doctorId).eq("clinic_id", clinicId).eq("active", true).maybeSingle(),
  ]);

  if (!clinic || clinic.owner_id !== userData.user.id) {
    return { status: "error", message: "Only the clinic administrator can create receptionist invitations." };
  }
  if (!doctor) {
    return { status: "error", message: "Choose an active doctor for this receptionist." };
  }

  const admin = createAdminClient();
  let delivery: InviteWhatsAppDelivery | null;
  try {
    delivery = await resolveInviteWhatsAppDelivery(admin, clinicId, recipientPhone);
  } catch {
    delivery = null;
  }
  if (!delivery) {
    return {
      status: "error",
      message: "WhatsApp is not available for this clinic or recipient in this environment.",
    };
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invitedPhoneHash = createHash("sha256").update(recipientPhone).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const rpc: Rpc = (name, args) => (admin.rpc as unknown as Rpc).call(admin, name, args);
  const { data, error } = await rpc("create_phone_staff_invite_link_service", {
    p_clinic_id: clinicId,
    p_assigned_doctor_id: doctorId,
    p_token_hash: tokenHash,
    p_invited_phone_hash: invitedPhoneHash,
    p_created_by: userData.user.id,
    p_expires_at: expiresAt.toISOString(),
  });

  if (error || typeof data !== "string") {
    console.error("Atlas receptionist invite link creation failed", { code: error?.code ?? "create_failed" });
    return { status: "error", message: "Atlas could not create the invitation. Try again." };
  }

  const url = `${atlasSiteUrl()}/join/${token}`;
  let sent = await sendWhatsAppStaffInviteTemplate(
    recipientPhone,
    clinic.name,
    url,
    delivery.templateName,
    delivery.config,
  );
  // Official Meta test WABAs can lack eligibility for custom templates. A
  // plain-text fallback is permitted only in non-production test mode and
  // only succeeds when the registered test recipient has an open 24-hour
  // conversation window. Production always remains template-only.
  if (!sent.accepted && delivery.testMode) {
    sent = await sendWhatsAppTextMessage(
      recipientPhone,
      `Atlas test invitation for ${clinic.name}: ${url}`,
      delivery.config,
    );
  }
  if (!sent.accepted) {
    return { status: "error", message: `The invitation was not activated because WhatsApp delivery failed (${sent.errorCode}).` };
  }

  // An invite is intentionally unusable until Meta accepts the message. This
  // records delivery evidence, marks sent_at, and revokes any older active
  // invite for the same clinic + phone without exposing the private table.
  const activation = await rpc("activate_phone_staff_invite_link_service", {
    p_token_hash: tokenHash,
    p_provider_message_id: sent.providerMessageId,
    p_created_by: userData.user.id,
  });

  let active = !activation.error && activation.data === true;
  if (!active) {
    // If the activation request lost its response after committing, the
    // preview RPC is an idempotent way to confirm that the link is active.
    try {
      active = await inviteIsActive(rpc, tokenHash);
    } catch {
      active = false;
    }
  }
  if (!active) {
    console.error("Atlas receptionist invite activation failed", { code: activation.error?.code ?? "activate_failed" });
    return {
      status: "error",
      message: "WhatsApp accepted the message, but Atlas could not activate the invitation. Create a new invitation.",
    };
  }

  return {
    status: "success",
    message: "Secure one-use invitation sent on WhatsApp. It expires in 24 hours.",
    url,
  };
}
