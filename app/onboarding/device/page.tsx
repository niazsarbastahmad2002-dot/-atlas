import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DeviceSetup } from "./device-setup";

export const dynamic = "force-dynamic";

export default async function DeviceOnboardingPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");

  return (
    <main className="center-page">
      <section className="auth-card" style={{ maxWidth: 520 }}>
        <div className="app-brand">
          <span className="app-brand-mark" aria-hidden="true">A</span>
          <span className="app-brand-word">Atlas</span>
        </div>
        <div className="eyebrow">One-time device setup</div>
        <h1>Make this device yours.</h1>
        <p className="quiet">
          Confirm your device security once. After this, Atlas keeps you signed in and normally opens straight to the clinic workspace.
        </p>
        <DeviceSetup />
      </section>
    </main>
  );
}
