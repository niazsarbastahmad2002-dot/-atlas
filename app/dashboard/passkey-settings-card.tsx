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
            <h2>Backup sign-in <span className="label-muted">· optional</span></h2>
            <p>Atlas normally keeps this device signed in. A passkey is only a faster backup if that session is ever lost.</p>
          </div>
        </div>
        <PasskeyManager />
      </section>
    </div>
  );
}
