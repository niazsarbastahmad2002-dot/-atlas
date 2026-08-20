"use server";

import { redirect } from "next/navigation";
import { revokeStoredAppleAuthorization } from "@/lib/apple-server";
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

  const hasAppleIdentity = userData.user.identities?.some((identity) => identity.provider === "apple") ?? false;
  let manualAppleRevokeNeeded = false;

  try {
    const appleResult = await revokeStoredAppleAuthorization(userData.user.id);
    manualAppleRevokeNeeded = hasAppleIdentity && appleResult !== "revoked";

    const admin = createAdminClient();
    const { error: deleteError } = await admin.auth.admin.deleteUser(userData.user.id);
    if (deleteError) throw deleteError;
  } catch (error) {
    console.error("Atlas account deletion failed", {
      error: error instanceof Error ? error.name : "unknown",
    });
    redirect(accountUrl("failed"));
  }

  // The database also RESTRICTs deletion of auth users who still own clinics,
  // so a concurrent ownership change cannot accidentally cascade a clinic.
  await supabase.auth.signOut().catch(() => undefined);
  redirect(manualAppleRevokeNeeded
    ? "/login?notice=account_deleted_apple_revoke_needed"
    : "/login?notice=account_deleted");
}
