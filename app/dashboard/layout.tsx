import type { ReactNode } from "react";
import { Suspense } from "react";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { AppNavigation } from "./app-navigation";
import { AppointmentContactRelationshipEnhancer } from "./appointment-contact-relationship";
import { AtlasContinuityMode } from "./continuity-mode";
import { DashboardClientPolish } from "./dashboard-client-polish";
import { MobileAppointmentExperience } from "./mobile-appointment-experience";
import { ResponsiveDashboardExperience } from "./responsive-dashboard-experience";
import { DashboardPreferenceMemory } from "./preference-memory";
import { DashboardScrollContinuity } from "./scroll-continuity";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const locale = await getUiLocale();

  return (
    <div className="app-shell">
      <AppointmentContactRelationshipEnhancer locale={locale} />
      <DashboardClientPolish locale={locale} />
      <MobileAppointmentExperience locale={locale} />
      <ResponsiveDashboardExperience locale={locale} />
      <DashboardPreferenceMemory />
      <Suspense fallback={null}>
        <DashboardScrollContinuity />
      </Suspense>
      <Suspense fallback={null}>
        <AtlasContinuityMode />
      </Suspense>
      <Suspense fallback={null}>
        <AppNavigation locale={locale} />
      </Suspense>
      <div className="app-content">{children}</div>
    </div>
  );
}
