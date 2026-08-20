"use server";

import { redirect } from "next/navigation";
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
