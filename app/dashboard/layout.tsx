import type { ReactNode } from "react";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { DashboardPreferenceMemory } from "./preference-memory";
import { AppNavigation } from "./app-navigation";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const locale = await getUiLocale();

  return (
    <div className="app-shell">
      <DashboardPreferenceMemory />
      <AppNavigation locale={locale} />
      <div className="app-content">{children}</div>
    </div>
  );
}
