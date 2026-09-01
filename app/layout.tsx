import type { Metadata, Viewport } from "next";
import { Noto_Sans_Arabic } from "next/font/google";
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
import "./atlas-settings-finish.css";
import "./atlas-dark-icon-polish.css";
import "./atlas-mobile-tap.css";

const atlasKurdishFont = Noto_Sans_Arabic({
  subsets: ["arabic"],
  display: "swap",
  preload: false,
  variable: "--font-atlas-kurdish",
});

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

export async function generateViewport(): Promise<Viewport> {
  const theme = await getUiTheme();
  const themeColor: Viewport["themeColor"] = theme === "dark"
    ? "#071b15"
    : theme === "light"
      ? "#f4f7f5"
      : [
          { media: "(prefers-color-scheme: light)", color: "#f4f7f5" },
          { media: "(prefers-color-scheme: dark)", color: "#071b15" },
        ];

  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor,
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [locale, theme] = await Promise.all([getUiLocale(), getUiTheme()]);
  const meta = uiLocaleMeta[locale];

  return (
    <html lang={meta.language} dir={meta.direction} data-theme={theme} className={atlasKurdishFont.variable}>
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
