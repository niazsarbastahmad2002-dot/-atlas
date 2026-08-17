import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DeviceOnboardingPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");

  // Passkeys are optional recovery/quick sign-in. Email sign-in should never
  // force reception staff through a second setup ceremony.
  redirect("/dashboard");
}
