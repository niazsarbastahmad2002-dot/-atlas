"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function accountUrl(error: string) {
  return `/dashboard/settings/account?error=${encodeURIComponent(error)}`;
}

export async function deleteAtlasAccount(formData: FormData) {
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  const acknowledged = String(formData.get("acknowledge") ?? "") === "yes";
  if (confirmation !== "DELETE" || !acknowledged) redirect(accountUrl("confirmation"));

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const { data: ownedClinics, error: ownedClinicsError } = await supabase
    .from("clinics")
    .select("id")
    .eq("owner_id", userData.user.id)
    .limit(1);

  if (ownedClinicsError) redirect(accountUrl("failed"));
  if (ownedClinics?.length) redirect(accountUrl("owns_clinic"));

  try {
    const admin = createAdminClient();
    const { error: deleteError } = await admin.auth.admin.deleteUser(userData.user.id);
    if (deleteError) {
      console.error("Atlas account deletion failed", { code: deleteError.code ?? "delete_failed" });
      redirect(accountUrl("failed"));
    }
  } catch (error) {
    console.error("Atlas account deletion failed", { error: error instanceof Error ? error.name : "unknown" });
    redirect(accountUrl("failed"));
  }

  // The auth user deletion cascades identities, sessions, passkeys and clinic memberships.
  // Historical audit actor references are preserved as NULL by database foreign keys.
  await supabase.auth.signOut().catch(() => undefined);
  redirect("/login?notice=account_deleted");
}
