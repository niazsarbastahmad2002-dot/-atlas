"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/appointments";
import { createClient } from "@/lib/supabase/server";

function deleteUrl(clinicId: string, error: string) {
  const params = new URLSearchParams({ clinic: clinicId, error });
  return `/dashboard/settings/delete?${params}`;
}

export async function deleteClinic(formData: FormData) {
  const clinicId = String(formData.get("clinic_id") ?? "");
  const confirmation = String(formData.get("clinic_name_confirm") ?? "");
  const acknowledged = String(formData.get("acknowledge") ?? "") === "yes";
  if (!isUuid(clinicId)) redirect("/dashboard/settings");
  if (!acknowledged) redirect(deleteUrl(clinicId, "confirmation_required"));

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const { data: clinic, error: clinicError } = await supabase
    .from("clinics")
    .select("id, name, owner_id")
    .eq("id", clinicId)
    .eq("owner_id", userData.user.id)
    .maybeSingle();

  if (clinicError || !clinic) redirect(deleteUrl(clinicId, "owner_required"));
  if (confirmation !== clinic.name) redirect(deleteUrl(clinicId, "name_mismatch"));

  const { data: deleted, error: deleteError } = await supabase
    .from("clinics")
    .delete()
    .eq("id", clinic.id)
    .eq("owner_id", userData.user.id)
    .select("id")
    .maybeSingle();

  if (deleteError || !deleted) {
    console.error("Atlas clinic deletion failed", { code: deleteError?.code ?? "not_deleted" });
    redirect(deleteUrl(clinicId, "failed"));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/account");

  // Clinic deletion and account deletion are intentionally separate. RLS limits this
  // query to clinics the same auth user still owns or explicitly belongs to.
  const { data: remainingClinics, error: remainingError } = await supabase
    .from("clinics")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1);

  if (!remainingError && remainingClinics?.length) {
    redirect(`/dashboard?clinic=${remainingClinics[0].id}`);
  }

  if (remainingError) {
    console.error("Atlas post-clinic-delete workspace lookup failed", { code: remainingError.code });
  }

  // Keep the Atlas identity and session after the last clinic is deleted. The account
  // page gives the user an explicit choice to keep the account or delete it separately.
  redirect("/dashboard/settings/account?notice=clinic_deleted");
}
