import type { ReactNode } from "react";
import { Suspense } from "react";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { DashboardPreferenceMemory } from "./preference-memory";
import { AppNavigation } from "./app-navigation";
import { DashboardScrollContinuity } from "./scroll-continuity";
import { PasskeySettingsCard } from "./passkey-settings-card";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const locale = await getUiLocale();

  return (
    <div className="app-shell">
      <DashboardPreferenceMemory />
      <Suspense fallback={null}>
        <DashboardScrollContinuity />
      </Suspense>
      <AppNavigation locale={locale} />
      <div className="app-content">
        {children}
        <PasskeySettingsCard />
      </div>
    </div>
  );
}
