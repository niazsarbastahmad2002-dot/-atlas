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

  // Deleting an Atlas account means deleting every clinic workspace owned by that
  // identity. Clinic foreign keys already enforce the same protected cleanup used
  // by the dedicated clinic-deletion screen.
  const { error: clinicsDeleteError } = await supabase
    .from("clinics")
    .delete()
    .eq("owner_id", userId);
  if (clinicsDeleteError) {
    console.error("Atlas account-owned clinic deletion failed", { code: clinicsDeleteError.code });
    redirect(accountUrl("failed"));
  }

  try {
    const admin = createAdminClient();
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;
  } catch (error) {
    // Owned clinics are already gone. The remaining identity is deliberately left
    // retryable rather than risking an inconsistent partial auth deletion.
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

  await supabase.auth.signOut().catch(() => undefined);
  redirect(manualAppleRevokeNeeded
    ? "/login?notice=account_deleted"
    : "/login?notice=account_deleted");
}
