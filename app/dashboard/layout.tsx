import type { ReactNode } from "react";
import { Suspense } from "react";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { AppNavigation } from "./app-navigation";
import { DashboardClientPolish } from "./dashboard-client-polish";
import { DashboardPreferenceMemory } from "./preference-memory";
import { DashboardScrollContinuity } from "./scroll-continuity";
import { PasskeySettingsCard } from "./passkey-settings-card";
import { QuickHourPolish } from "./quick-hour-polish";
import { SettingsClientPolish } from "./settings-client-polish";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const locale = await getUiLocale();

  return (
    <div className="app-shell">
      <DashboardClientPolish locale={locale} />
      <SettingsClientPolish locale={locale} />
      <QuickHourPolish />
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
