"use server";

import { redirect } from "next/navigation";
import {
  cleanupAppleRefreshSecret,
  getStoredAppleRevocationCredential,
  revokeAppleAuthorization,
  type AppleRevocationCredential,
} from "@/lib/apple-server";
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
  let appleCredential: AppleRevocationCredential | null = null;

  try {
    appleCredential = await getStoredAppleRevocationCredential(userData.user.id);
  } catch (error) {
    // Do not delete the Atlas account while a stored Apple credential may be
    // unreadable. That could orphan a Vault secret and remove the automatic
    // revocation path. The user can retry after the transient failure clears.
    console.error("Atlas Apple revocation credential read failed", {
      error: error instanceof Error ? error.name : "unknown",
    });
    redirect(accountUrl("failed"));
  }

  try {
    const admin = createAdminClient();
    const { error: deleteError } = await admin.auth.admin.deleteUser(userData.user.id);
    if (deleteError) throw deleteError;
  } catch (error) {
    // Nothing destructive has happened to the Apple credential at this point,
    // so a failed Atlas deletion remains fully retryable.
    console.error("Atlas account deletion failed", {
      error: error instanceof Error ? error.name : "unknown",
    });
    redirect(accountUrl("failed"));
  }

  let manualAppleRevokeNeeded = hasAppleIdentity && !appleCredential;

  if (appleCredential) {
    try {
      const appleResult = await revokeAppleAuthorization(appleCredential);
      manualAppleRevokeNeeded = appleResult !== "revoked";
    } catch {
      manualAppleRevokeNeeded = true;
    }

    try {
      // The auth-user deletion already cascaded the private token row. Delete
      // the Vault secret by the ID captured before deletion so no credential is
      // retained after the user's Atlas account is gone.
      await cleanupAppleRefreshSecret(appleCredential.refreshSecretId);
    } catch (cleanupError) {
      console.error("Atlas Apple refresh-secret cleanup failed", {
        error: cleanupError instanceof Error ? cleanupError.name : "unknown",
      });
    }
  }

  // The database also RESTRICTs deletion of auth users who still own clinics,
  // so a concurrent ownership change cannot accidentally cascade a clinic.
  await supabase.auth.signOut().catch(() => undefined);
  redirect(manualAppleRevokeNeeded
    ? "/login?notice=account_deleted_apple_revoke_needed"
    : "/login?notice=account_deleted");
}
