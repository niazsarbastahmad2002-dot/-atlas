"use client";

import { usePathname } from "next/navigation";
import { PasskeyManager } from "./settings/passkey-manager";

export function PasskeySettingsCard() {
  const pathname = usePathname();
  if (!pathname.startsWith("/dashboard/settings")) return null;

  return (
    <div className="shell" style={{ paddingBottom: 32 }}>
      <section className="settings-card settings-card-accent" style={{ maxWidth: 760 }}>
        <div className="settings-card-heading">
          <span className="settings-card-icon" aria-hidden="true">⌁</span>
          <div>
            <div className="eyebrow">Account security</div>
            <h2>Passkey sign-in</h2>
            <p>Fast sign-in without Google Cloud or an email link.</p>
          </div>
        </div>
        <PasskeyManager />
      </section>
    </div>
  );
}
