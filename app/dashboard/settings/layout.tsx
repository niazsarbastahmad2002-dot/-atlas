import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  let ownsClinic = false;

  if (userData.user) {
    const { data } = await supabase
      .from("clinics")
      .select("id")
      .eq("owner_id", userData.user.id)
      .limit(1);
    ownsClinic = Boolean(data?.length);
  }

  return (
    <>
      {children}
      {ownsClinic ? (
        <div className="shell" style={{ paddingTop: 0, paddingBottom: 32 }}>
          <Link className="danger-link" href="/dashboard/settings/delete">Delete a clinic permanently</Link>
        </div>
      ) : null}
    </>
  );
}
