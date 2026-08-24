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
  const userId = userData.user.id;

  const hasAppleIdentity = userData.user.identities?.some((identity) => identity.provider === "apple") ?? false;
  let appleCredential: AppleRevocationCredential | null = null;
  try {
    appleCredential = await getStoredAppleRevocationCredential(userId);
  } catch (error) {
    console.error("Atlas Apple revocation credential read failed", { error: error instanceof Error ? error.name : "unknown" });
  }

  try {
    const admin = createAdminClient();
    // clinics.owner_id now uses ON DELETE CASCADE. Deleting the auth identity is
    // therefore the one atomic database operation: if this delete fails, owned
    // clinics remain; if it succeeds, every owned clinic and its existing
    // clinic-scoped cascade tree are removed in the same database transaction.
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;
  } catch (error) {
    console.error("Atlas account deletion failed", { error: error instanceof Error ? error.name : "unknown" });
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
      await cleanupAppleRefreshSecret(appleCredential.refreshSecretId);
    } catch (cleanupError) {
      console.error("Atlas Apple refresh-secret cleanup failed", { error: cleanupError instanceof Error ? cleanupError.name : "unknown" });
    }
  }

  if (manualAppleRevokeNeeded) {
    console.warn("Atlas account deleted; historical Apple authorization may still require provider-side revocation");
  }

  await supabase.auth.signOut().catch(() => undefined);
  redirect("/login?notice=account_deleted");
}
