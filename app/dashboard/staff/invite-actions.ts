"use server";

import { createHash, randomBytes } from "node:crypto";
import { isUuid } from "@/lib/appointments";
import { atlasPublicOrigin } from "@/lib/atlas-origin";
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


type InviteError = "doctor_first" | "sign_in" | "administrator" | "active_doctor" | "create_failed";

function errorMessage(locale: UiLocale, reason: InviteError) {
  const messages: Record<UiLocale, Record<InviteError, string>> = {
    en: {
      doctor_first: "Choose the receptionist's doctor first.",
      sign_in: "Sign in again before creating an invitation.",
      administrator: "Only the clinic administrator can create receptionist invitations.",
      active_doctor: "Choose an active doctor for this receptionist.",
      create_failed: "Atlas could not create the invitation. Try again.",
    },
    ku: {
      doctor_first: "سەرەتا پزیشکی ڕیسێپشن دیاری بکە.",
      sign_in: "پێش دروستکردنی بانگهێشتەکە دووبارە بچۆ ژوورەوە.",
      administrator: "تەنها بەڕێوەبەری کلینیک دەتوانێت بانگهێشتی ڕیسێپشن دروست بکات.",
      active_doctor: "پزیشکێکی چالاک بۆ ئەم ڕیسێپشنە دیاری بکە.",
      create_failed: "Atlas نەیتوانی بانگهێشتەکە دروست بکات. دووبارە هەوڵ بدە.",
    },
    bd: {
      doctor_first: "سەرەدا دکتۆرێ ڕیسێپشنێ دیار بکە.",
      sign_in: "بەری دروستکرنا بانگهێشتێ جارەکا دی بچۆ ژوور.",
      administrator: "تەنێ بەڕێڤەبەرێ کلینیکێ دشێت بانگهێشتا ڕیسێپشنێ دروست بکەت.",
      active_doctor: "دکتۆرەکێ چالاک بۆ ڤێ ڕیسێپشنێ دیار بکە.",
      create_failed: "Atlas نەشیا بانگهێشتێ دروست بکەت. جارەکا دی هەول بدە.",
    },
    ar: {
      doctor_first: "اختَر طبيب موظف الاستقبال أولاً.",
      sign_in: "سجّل الدخول مرة ثانية قبل إنشاء الدعوة.",
      administrator: "فقط مسؤول العيادة يقدر ينشئ دعوات لموظفي الاستقبال.",
      active_doctor: "اختَر طبيباً فعالاً لموظف الاستقبال.",
      create_failed: "ما قدر Atlas ينشئ الدعوة. حاول مرة ثانية.",
    },
  };
  return messages[locale][reason];
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
    return { status: "error", message: errorMessage(inviteLocale, "doctor_first") };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { status: "error", message: errorMessage(inviteLocale, "sign_in") };
  }

  const [{ data: clinic }, { data: doctor }] = await Promise.all([
    supabase.from("clinics").select("id, owner_id").eq("id", clinicId).maybeSingle(),
    supabase.from("doctors").select("id").eq("id", doctorId).eq("clinic_id", clinicId).eq("active", true).maybeSingle(),
  ]);

  if (!clinic || clinic.owner_id !== userData.user.id) {
    return { status: "error", message: errorMessage(inviteLocale, "administrator") };
  }
  if (!doctor) {
    return { status: "error", message: errorMessage(inviteLocale, "active_doctor") };
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
    return { status: "error", message: errorMessage(inviteLocale, "create_failed") };
  }

  return {
    status: "success",
    message: successMessage(inviteLocale),
    url: `${atlasPublicOrigin()}/join/${token}?lang=${encodeURIComponent(inviteLocale)}`,
  };
}
