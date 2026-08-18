import type { ReactNode } from "react";
import { Suspense } from "react";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { AppNavigation } from "./app-navigation";
import { DashboardClientPolish } from "./dashboard-client-polish";
import { DashboardPreferenceMemory } from "./preference-memory";
import { DashboardScrollContinuity } from "./scroll-continuity";
import { DoctorScheduleTabs } from "./doctor-schedule-tabs";
import { InstantSettingChoices } from "./instant-setting-choices";
import { LiteralTextGuard } from "./literal-text-guard";
import { QuickHourPolish } from "./quick-hour-polish";
import { ScheduleNavigationPolish } from "./schedule-navigation-polish";
import { SettingsClientPolish } from "./settings-client-polish";
import { SettingsDraftGuard } from "./settings-draft-guard";
import { SettingsHistoryShortcut } from "./settings-history-shortcut";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const locale = await getUiLocale();

  return (
    <div className="app-shell">
      <LiteralTextGuard />
      <InstantSettingChoices />
      <SettingsDraftGuard locale={locale} />
      <DoctorScheduleTabs locale={locale} />
      <DashboardClientPolish locale={locale} />
      <SettingsClientPolish locale={locale} />
      <SettingsHistoryShortcut locale={locale} />
      <QuickHourPolish />
      <ScheduleNavigationPolish />
      <DashboardPreferenceMemory />
      <Suspense fallback={null}>
        <DashboardScrollContinuity />
      </Suspense>
      <Suspense fallback={null}>
        <AppNavigation locale={locale} />
      </Suspense>
      <div className="app-content">
        {children}
      </div>
    </div>
  );
}
