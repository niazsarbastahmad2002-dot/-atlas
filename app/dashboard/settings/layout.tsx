import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  let ownedClinicId: string | null = null;

  if (userData.user) {
    const { data } = await supabase
      .from("clinics")
      .select("id")
      .eq("owner_id", userData.user.id)
      .order("created_at", { ascending: true })
      .limit(1);
    ownedClinicId = data?.[0]?.id ?? null;
  }

  return (
    <>
      {children}
      {userData.user ? (
        <div className="shell" style={{ paddingTop: 0, paddingBottom: 32, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {ownedClinicId ? <Link className="button button-ghost button-small" href={`/dashboard/staff/invite?clinic=${ownedClinicId}`}>Invite receptionist</Link> : null}
          <Link className="button button-ghost button-small" href="/privacy">Privacy</Link>
          <Link className="button button-ghost button-small" href="/terms">Terms</Link>
          <Link className="button button-ghost button-small" href="/dashboard/settings/account">Account & deletion</Link>
          {ownedClinicId ? <Link className="danger-link" href="/dashboard/settings/delete">Delete a clinic permanently</Link> : null}
        </div>
      ) : null}
    </>
  );
}
