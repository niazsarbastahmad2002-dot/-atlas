"use server";

import { createHash, randomBytes } from "node:crypto";
import { isUuid } from "@/lib/appointments";
import type { UiLocale } from "@/lib/i18n/ui";
import { getUiLocale } from "@/lib/i18n/ui-server";
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
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) return `https://${productionHost.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

function successMessage(locale: UiLocale) {
  if (locale === "ku") return "بانگهێشتی پارێزراوی یەکجارە ئامادەیە. دوای 24 کاتژمێر بەسەر دەچێت.";
  if (locale === "bd") return "بانگهێشتا پاراستی یا ئێکجارە ئامادەیە. پشتی 24 دەمژمێران دەمێ وێ بەسەر دچیت.";
  if (locale === "ar") return "الدعوة الآمنة ذات الاستخدام الواحد جاهزة. تنتهي بعد 24 ساعة.";
  return "Secure one-use invitation ready. It expires in 24 hours.";
}

export async function createReceptionistInviteLink(
  _previous: InviteLinkState,
  formData: FormData,
): Promise<InviteLinkState> {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const doctorId = String(formData.get("assigned_doctor_id") ?? "");
  const inviteLocale = await getUiLocale();
  if (!isUuid(clinicId) || !isUuid(doctorId)) {
    return { status: "error", message: "Choose the receptionist's doctor first." };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { status: "error", message: "Sign in again before creating an invitation." };
  }

  const [{ data: clinic }, { data: doctor }] = await Promise.all([
    supabase.from("clinics").select("id, owner_id").eq("id", clinicId).maybeSingle(),
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
  const rpc: Rpc = (name, args) => (admin.rpc as unknown as Rpc).call(admin, name, args);
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

  return {
    status: "success",
    message: successMessage(inviteLocale),
    url: `${atlasSiteUrl()}/join/${token}?lang=${encodeURIComponent(inviteLocale)}`,
  };
}
