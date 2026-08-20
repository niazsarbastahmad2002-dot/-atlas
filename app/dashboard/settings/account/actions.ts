"use server";

import { redirect } from "next/navigation";
import { revokeAndForgetStoredAppleAuthorization } from "@/lib/apple-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function accountUrl(error: string) {
  return `/dashboard/settings/account?error=${encodeURIComponent(error)}`;
}

export async function deleteAtlasAccount(formData: FormData) {
  const confirmation = String(formData.get("email_confirm") ?? "").trim().toLowerCase();

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;
  if (userError || !user) redirect("/login");

  const email = user.email?.trim().toLowerCase();
  if (!email || confirmation !== email) redirect(accountUrl("email_mismatch"));

  // Apple requires Sign in with Apple authorization to be revoked when an app
  // deletes the user's account. Always continue with Atlas data deletion if Apple
  // is temporarily unavailable; the encrypted provider token is forgotten either way.
  try {
    await revokeAndForgetStoredAppleAuthorization(user.id);
  } catch (error) {
    console.error("Atlas Apple authorization cleanup failed during account deletion", {
      code: error instanceof Error ? error.message : "apple_cleanup_failed",
    });
  }

  const admin = createAdminClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("Atlas account deletion failed", { code: deleteError.code ?? "delete_failed" });
    redirect(accountUrl("failed"));
  }

  // The user no longer exists after the admin deletion. Best-effort sign-out clears
  // the browser auth cookies immediately; the deleted session is invalid regardless.
  try {
    await supabase.auth.signOut();
  } catch {
    // Account deletion already succeeded; never turn a cookie cleanup issue into a failure.
  }

  redirect("/login?notice=account_deleted");
}
