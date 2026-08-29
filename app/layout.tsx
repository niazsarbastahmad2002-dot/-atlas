import type { Metadata, Viewport } from "next";
import { AtlasAnalytics } from "@/app/components/atlas-analytics";
import { AtlasTimePickerPolish } from "@/app/components/atlas-time-picker-polish";
import { ContinuityCacheGuard } from "@/app/components/continuity-cache-guard";
import { KurdishSecretaryTerminology } from "@/app/components/kurdish-secretary-terminology";
import { LivePageRefresh } from "@/app/components/live-page-refresh";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { getUiTheme } from "@/lib/i18n/ui-theme-server";
import { uiLocaleMeta } from "@/lib/i18n/ui";
import "./globals.css";
import "./polish.css";
import "./atlas-perfect.css";
import "./atlas-login-brand.css";
import "./atlas-login-touch.css";
import "./atlas-brand-v2.css";
import "./atlas-orbit.css";
import "./atlas-reception-flow.css";
import "./atlas-instant-flow.css";
import "./atlas-interactions.css";
import "./atlas-readability.css";
import "./patient-clarity.css";
import "./atlas-quality-design.css";
import "./atlas-simple-core.css";
import "./atlas-theme.css";
import "./atlas-account-polish.css";
import "./atlas-dark-v2.css";
import "./atlas-dark-guards.css";
import "./atlas-auth-polish.css";

export const metadata: Metadata = {
  title: "Atlas — Clinic Appointments",
  description: "A focused appointment and reminder system for private clinics.",
  applicationName: "Atlas",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Atlas",
  },
  icons: {
    icon: "/atlas-icon.svg",
    apple: "/atlas-icon.svg",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#071f19",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [locale, theme] = await Promise.all([getUiLocale(), getUiTheme()]);
  const meta = uiLocaleMeta[locale];

  return (
    <html lang={meta.language} dir={meta.direction} data-theme={theme}>
      <body>
        {children}
        <ContinuityCacheGuard />
        <LivePageRefresh />
        <AtlasAnalytics />
        <AtlasTimePickerPolish locale={locale} />
        <KurdishSecretaryTerminology locale={locale} />
      </body>
    </html>
  );
}
