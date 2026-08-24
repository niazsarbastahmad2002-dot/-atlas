"use server";

import { createHash, randomBytes } from "node:crypto";
import { isUuid } from "@/lib/appointments";
import { maskPhone, normalizeAuthPhone } from "@/lib/phone-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hashVerifiedPhone } from "@/lib/whatsapp-verification";
import { sendReceptionistInviteWhatsApp } from "@/lib/whatsapp-staff-invite";

export type InviteLinkState = {
  status: "idle" | "success" | "error";
  message: string;
  phone?: string;
};

type RpcResult = { data: unknown; error: { message?: string; code?: string } | null };
type Rpc = (name: string, args: Record<string, unknown>) => Promise<RpcResult>;

export async function createReceptionistInviteLink(
  _previous: InviteLinkState,
  formData: FormData,
): Promise<InviteLinkState> {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const doctorId = String(formData.get("assigned_doctor_id") ?? "");
  const phone = normalizeAuthPhone(String(formData.get("phone") ?? ""));
  if (!isUuid(clinicId) || !isUuid(doctorId)) {
    return { status: "error", message: "Choose the receptionist's doctor first." };
  }
  if (!phone) {
    return { status: "error", message: "Enter the receptionist's WhatsApp phone number, including the country code. Iraq numbers can be entered as 0750…" };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { status: "error", message: "Sign in again before inviting a receptionist." };
  }

  const [{ data: clinic }, { data: doctor }] = await Promise.all([
    supabase.from("clinics").select("id, name, owner_id").eq("id", clinicId).maybeSingle(),
    supabase.from("doctors").select("id").eq("id", doctorId).eq("clinic_id", clinicId).eq("active", true).maybeSingle(),
  ]);
  if (!clinic || clinic.owner_id !== userData.user.id) {
    return { status: "error", message: "Only the clinic administrator can invite receptionists." };
  }
  if (!doctor) {
    return { status: "error", message: "Choose an active doctor for this receptionist." };
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const admin = createAdminClient();
  const rpc = admin.rpc as unknown as Rpc;
  const { data, error } = await rpc("create_phone_staff_invite_link_service", {
    p_clinic_id: clinicId,
    p_assigned_doctor_id: doctorId,
    p_token_hash: tokenHash,
    p_invited_phone_hash: hashVerifiedPhone(phone),
    p_created_by: userData.user.id,
    p_expires_at: expiresAt.toISOString(),
  });
  if (error || typeof data !== "string") {
    console.error("Atlas phone-bound receptionist invite creation failed", { code: error?.code ?? "create_failed" });
    return { status: "error", message: "Atlas could not create the invitation. Try again." };
  }

  const sent = await sendReceptionistInviteWhatsApp({
    phone,
    clinicName: clinic.name,
    inviteToken: token,
  });
  if (!sent.ok) {
    const privateDb = (admin as any).schema("private");
    await privateDb.from("staff_invite_links").delete().eq("token_hash", tokenHash).is("sent_at", null);
    return {
      status: "error",
      message: sent.error === "whatsapp_not_configured"
        ? "Atlas has the secure receptionist invite ready, but its WhatsApp Business sender or approved template is not connected yet. No email invitation was created."
        : "Atlas could not deliver the invitation on WhatsApp. Check the phone number and try again.",
    };
  }

  let activated = await rpc("activate_phone_staff_invite_link_service", {
    p_token_hash: tokenHash,
    p_provider_message_id: sent.messageId,
    p_created_by: userData.user.id,
  });
  if (activated.error || activated.data !== true) {
    // A short retry protects against a transient DB connection loss after Meta
    // already accepted the message. The invite is not redeemable until activation.
    activated = await rpc("activate_phone_staff_invite_link_service", {
      p_token_hash: tokenHash,
      p_provider_message_id: sent.messageId,
      p_created_by: userData.user.id,
    });
  }
  if (activated.error || activated.data !== true) {
    console.error("Atlas receptionist invite delivery accepted but activation failed", { code: activated.error?.code ?? "activate_failed" });
    return {
      status: "error",
      message: "WhatsApp accepted the invitation, but Atlas could not activate the secure link. Send a new invitation; any older working link remains valid.",
    };
  }

  return {
    status: "success",
    message: `Invitation sent to ${maskPhone(phone)} on WhatsApp. The newest secure link works once and expires in 24 hours.`,
    phone,
  };
}
