import { NextResponse } from "next/server";
import { isUuid } from "@/lib/appointments";
import {
  readPendingStaffInvitations,
  withoutPendingStaffInvitation,
} from "@/lib/staff-invitations";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return NextResponse.redirect(new URL("/login?error=invalid_link", requestUrl.origin));
  }

  const admin = createAdminClient();
  const { data: authData, error: authError } = await admin.auth.admin.getUserById(userData.user.id);
  if (authError || !authData.user) {
    return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
  }

  const pending = readPendingStaffInvitations(authData.user.app_metadata);
  let nextMetadata = authData.user.app_metadata;

  for (const invitation of pending) {
    if (!isUuid(invitation.clinic_id) || !isUuid(invitation.assigned_doctor_id)) continue;

    const [{ data: clinic }, { data: doctor }] = await Promise.all([
      admin
        .from("clinics")
        .select("id")
        .eq("id", invitation.clinic_id)
        .maybeSingle(),
      admin
        .from("doctors")
        .select("id")
        .eq("id", invitation.assigned_doctor_id)
        .eq("clinic_id", invitation.clinic_id)
        .eq("active", true)
        .maybeSingle(),
    ]);

    if (!clinic || !doctor) continue;

    const { error: memberError } = await admin.from("clinic_members").upsert({
      clinic_id: invitation.clinic_id,
      user_id: userData.user.id,
      role: "receptionist",
      assigned_doctor_id: invitation.assigned_doctor_id,
    }, { onConflict: "clinic_id,user_id" });

    if (memberError) {
      console.error("Atlas receptionist invitation activation failed", {
        clinicId: invitation.clinic_id,
        code: memberError.code,
      });
      continue;
    }

    nextMetadata = withoutPendingStaffInvitation(nextMetadata, invitation.clinic_id);
  }

  if (nextMetadata !== authData.user.app_metadata) {
    const { error: metadataError } = await admin.auth.admin.updateUserById(userData.user.id, {
      app_metadata: nextMetadata,
    });
    if (metadataError) {
      console.error("Atlas receptionist invitation cleanup failed", { message: metadataError.message });
    }
  }

  return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
}
