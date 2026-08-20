"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cleanDisplayName, isUuid } from "@/lib/appointments";
import { createClient } from "@/lib/supabase/server";

function deleteUrl(error: string) {
  return `/dashboard/settings/delete?error=${encodeURIComponent(error)}`;
}

export async function deleteClinic(formData: FormData) {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const confirmation = cleanDisplayName(String(formData.get("clinic_name_confirm") ?? ""));
  if (!isUuid(clinicId)) redirect(deleteUrl("invalid"));

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const { data: clinic, error: clinicError } = await supabase
    .from("clinics")
    .select("id, name, owner_id")
    .eq("id", clinicId)
    .eq("owner_id", userData.user.id)
    .maybeSingle();

  if (clinicError || !clinic) redirect(deleteUrl("owner_required"));
  if (confirmation !== cleanDisplayName(clinic.name)) redirect(deleteUrl("name_mismatch"));

  const { data: deleted, error: deleteError } = await supabase
    .from("clinics")
    .delete()
    .eq("id", clinic.id)
    .eq("owner_id", userData.user.id)
    .select("id")
    .maybeSingle();

  if (deleteError || !deleted) {
    console.error("Atlas clinic deletion failed", { code: deleteError?.code ?? "not_deleted" });
    redirect(deleteUrl("failed"));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  redirect("/dashboard");
}
