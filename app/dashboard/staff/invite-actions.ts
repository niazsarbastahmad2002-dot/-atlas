"use server";

import { createHash, randomBytes } from "node:crypto";
import { isUuid } from "@/lib/appointments";
import { normalizeAuthPhone } from "@/lib/phone-auth";
import {
  atlasWhatsAppRecipientAllowed,
  readAtlasWhatsAppRuntime,
} from "@/lib/reminders/whatsapp-runtime";
import { sendWhatsAppStaffInviteTemplate } from "@/lib/reminders/whatsapp";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type InviteLinkState = {
  status: "idle" | "success" | "error";
  message: string;
  url?: string;
};

type RpcResult = { data: unknown; error: { message?: string; code?: string } | null };
type Rpc = (name: string, args: Record<string, unknown>) => Promise<RpcResult>;

function atlasSiteUrl() {
  const configured = process.env.SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.VERCEL_ENV !== "production") {
    const previewHost = process.env.VERCEL_URL?.trim();
    if (previewHost) return `https://${previewHost.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) return `https://${productionHost.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export async function createReceptionistInviteLink(
  _previous: InviteLinkState,
  formData: FormData,
): Promise<InviteLinkState> {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const doctorId = String(formData.get("assigned_doctor_id") ?? "");
  const rawRecipientPhone = String(formData.get("recipient_phone") ?? "").trim();
  const directInviteRequested = Boolean(rawRecipientPhone) && process.env.WHATSAPP_DIRECT_INVITES_ENABLED === "true";
  const recipientPhone = rawRecipientPhone ? normalizeAuthPhone(rawRecipientPhone) : null;
  if (!isUuid(clinicId) || !isUuid(doctorId)) {
    return { status: "error", message: "Choose the receptionist's doctor first." };
  }
  if (directInviteRequested && !recipientPhone) {
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

  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const admin = createAdminClient();
  const rpc = admin.rpc as unknown as Rpc;
  const { data, error } = await rpc("create_staff_invite_link_service", {
    p_clinic_id: clinicId,
    p_assigned_doctor_id: doctorId,
    p_token_hash: hash,
    p_created_by: userData.user.id,
    p_expires_at: expiresAt.toISOString(),
  });

  if (error || typeof data !== "string") {
    console.error("Atlas receptionist invite link creation failed", { code: error?.code ?? "create_failed" });
    return { status: "error", message: "Atlas could not create the invitation. Try again." };
  }

  const url = `${atlasSiteUrl()}/join/${token}`;
  if (directInviteRequested && recipientPhone) {
    let runtimeConfig;
    try { runtimeConfig = readAtlasWhatsAppRuntime(); } catch {
      return { status: "error", message: "The invitation link was created, but WhatsApp is not configured.", url };
    }
    if (!runtimeConfig || !atlasWhatsAppRecipientAllowed(runtimeConfig, recipientPhone)) {
      return { status: "error", message: "The invitation link was created, but that WhatsApp recipient is not allowed in this environment.", url };
    }
    const sent = await sendWhatsAppStaffInviteTemplate(
      recipientPhone,
      clinic.name,
      url,
      runtimeConfig.staffInviteTemplateName,
      runtimeConfig.config,
    );
    if (!sent.accepted) {
      return { status: "error", message: `The invitation link was created, but WhatsApp delivery failed (${sent.errorCode}).`, url };
    }
    return {
      status: "success",
      message: "Secure one-use invitation sent on WhatsApp. It expires in 24 hours.",
      url,
    };
  }

  return {
    status: "success",
    message: "Secure one-use invitation ready. It expires in 24 hours.",
    url,
  };
}
